import { Directory, File, Paths } from "expo-file-system";
import { Vibration } from "react-native";
import { startAlarm, stopAlarm } from "./alarm";
import { api, uploadAudioChunk } from "./api";
import { snapshot } from "./geo";
import { saveActive, sessionStore } from "./session";
import { loadJson, saveJson } from "./storage";
import { createStore } from "./store";
import { PANIC_INTERVAL_MS, startTracking } from "./tracking";

// Panic mode: instant server alert, audio in 10 s chunks, location every 5 s.
// Chunks are saved on the phone first and uploaded from a queue, so nothing is lost offline.

export interface PanicState {
  active: boolean;
  localId: string | null;
  sessionId: string | null;
  guardianUrl: string | null;
  reason: "sos" | "keyword" | null;
  keyword: string | null;
  startedAt: number | null;
  alertSent: boolean;
  nextSeq: number;
  chunksSent: number;
  chunksWaiting: number;
  error: string | null;
}

const IDLE: PanicState = {
  active: false, localId: null, sessionId: null, guardianUrl: null, reason: null, keyword: null,
  startedAt: null, alertSent: false, nextSeq: 0, chunksSent: 0, chunksWaiting: 0, error: null,
};

export const panicStore = createStore<PanicState>(IDLE);

const STATE_KEY = "sw.panic";
const QUEUE_KEY = "sw.audioQueue";
const ID_MAP_KEY = "sw.audioSessionIds"; // localId -> server session id

interface QueuedChunk {
  localId: string;
  seq: number;
  uri: string;
  startedAt: number;
}

function update(patch: Partial<PanicState>) {
  panicStore.set((s) => ({ ...s, ...patch }));
  void saveJson(STATE_KEY, panicStore.get());
}

export async function restorePanic() {
  const saved = await loadJson<PanicState>(STATE_KEY, IDLE);
  panicStore.set(saved);
  const queue = await loadJson<QueuedChunk[]>(QUEUE_KEY, []);
  panicStore.set((s) => ({ ...s, chunksWaiting: queue.length }));
  if (saved.active && !saved.alertSent) void sendAlert();
  void flushQueue();
}

// SOS button or keyword. The first alert is sent by the server as a fixed template.
export async function startPanic(reason: "sos" | "keyword", info: { keyword?: string; snippets?: string[] } = {}) {
  if (panicStore.get().active) return;
  Vibration.vibrate([0, 120, 80, 120]);
  // SOS button: loud siren so people nearby notice. Keyword triggers stay silent (no escalation risk).
  if (reason === "sos") void startAlarm();
  update({
    ...IDLE,
    active: true,
    localId: `p${Date.now()}`,
    reason,
    keyword: info.keyword ?? null,
    startedAt: Date.now(),
    chunksWaiting: panicStore.get().chunksWaiting,
  });
  void sendAlert(info.snippets ?? []);
}

// Retries until the server has the alert (bad network must not lose an SOS).
async function sendAlert(snippets: string[] = []) {
  for (let attempt = 0; panicStore.get().active && !panicStore.get().alertSent; attempt++) {
    try {
      const where = await snapshot();
      const current = sessionStore.get();
      const p = panicStore.get();
      const res =
        p.reason === "keyword" && current
          ? await api.keyword(current.id, { ...where, keyword: p.keyword ?? "help", snippets })
          : await api.panic({ ...where, sessionId: current?.id });
      const ids = await loadJson<Record<string, string>>(ID_MAP_KEY, {});
      ids[p.localId!] = res.sessionId;
      await saveJson(ID_MAP_KEY, ids);
      update({ alertSent: true, sessionId: res.sessionId, guardianUrl: res.guardianUrl, error: null });
      await saveActive({
        id: res.sessionId,
        kind: current?.id === res.sessionId ? current.kind : "panic",
        guardianUrl: res.guardianUrl,
        startedAt: current?.startedAt ?? Date.now(),
        destination: current?.destination,
        panic: true,
      });
      await startTracking(PANIC_INTERVAL_MS).catch(() => undefined);
      void flushQueue();
      return;
    } catch (err) {
      update({ error: (err as Error).message });
      await new Promise((r) => setTimeout(r, Math.min(15_000, 2000 * (attempt + 1))));
    }
  }
}

// Stops recording on this phone. Ending the server session is done by endWithPin().
export function stopPanicLocal() {
  void stopAlarm();
  if (!panicStore.get().active) return;
  update({ active: false });
}

const audioDir = () => {
  const dir = new Directory(Paths.document, "panic-audio");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

// Called by the recorder after each 10 s chunk.
export async function addChunk(recordedUri: string, startedAt: number) {
  const p = panicStore.get();
  if (!p.localId) return;
  const seq = p.nextSeq;
  update({ nextSeq: seq + 1 });
  let uri = recordedUri;
  try {
    const src = new File(recordedUri);
    const ext = src.extension || ".m4a";
    const dest = new File(audioDir(), `${p.localId}-${String(seq).padStart(5, "0")}${ext}`);
    src.move(dest);
    uri = dest.uri;
  } catch {
    // keep the recorder's own file if the move fails
  }
  const queue = await loadJson<QueuedChunk[]>(QUEUE_KEY, []);
  queue.push({ localId: p.localId, seq, uri, startedAt });
  await saveJson(QUEUE_KEY, queue);
  update({ chunksWaiting: queue.length });
  void flushQueue();
}

let flushing = false;

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const queue = await loadJson<QueuedChunk[]>(QUEUE_KEY, []);
      update({ chunksWaiting: queue.length });
      if (queue.length === 0) return;
      const ids = await loadJson<Record<string, string>>(ID_MAP_KEY, {});
      const item = queue.find((q) => ids[q.localId]);
      if (!item) return; // waiting for the alert call to give us a session id
      try {
        await uploadAudioChunk(ids[item.localId], item.seq, item.uri, item.startedAt);
        try {
          new File(item.uri).delete();
        } catch {
          // already gone
        }
        const rest = (await loadJson<QueuedChunk[]>(QUEUE_KEY, [])).filter((q) => !(q.localId === item.localId && q.seq === item.seq));
        await saveJson(QUEUE_KEY, rest);
        update({ chunksSent: panicStore.get().chunksSent + 1, chunksWaiting: rest.length });
      } catch {
        await new Promise((r) => setTimeout(r, Math.min(30_000, 3000 * (attempt + 1))));
      }
    }
  } finally {
    flushing = false;
  }
}
