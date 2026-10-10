import { api } from "./api";
import { loadJson, saveJson } from "./storage";
import { createStore } from "./store";

// The one session the phone is running right now (walk, uneasy mode or SOS), persisted so a
// restart of the app keeps sending heartbeats for it.
export interface ActiveSession {
  id: string;
  kind: "walk" | "suspicion" | "panic";
  guardianUrl: string;
  startedAt: number;
  destination?: string;
  timerEndsAt?: number | null;
  suspicionEndsAt?: number;
  buddyMatchId?: string;
  /** SOS or keyword fired: recording on, safe zones ignored, 5 s heartbeats. */
  panic?: boolean;
}

const KEY = "sw.active";
export const sessionStore = createStore<ActiveSession | null>(null);

export async function loadActive(): Promise<ActiveSession | null> {
  const s = await loadJson<ActiveSession | null>(KEY, null);
  sessionStore.set(s);
  return s;
}

export async function saveActive(s: ActiveSession | null) {
  sessionStore.set(s);
  await saveJson(KEY, s);
}

// Ending a session must reach the server even on a bad network — above all a duress end,
// which is what raises the silent alert. Unsent ends are kept and retried.
const PENDING_KEY = "sw.pendingEnds";
type PendingEnd = { id: string; reason: "cancel" | "duress" };
let retrying = false;

export async function sendEnd(id: string, reason: "cancel" | "duress") {
  const pending = await loadJson<PendingEnd[]>(PENDING_KEY, []);
  pending.push({ id, reason });
  await saveJson(PENDING_KEY, pending);
  await flushPendingEnds();
}

export async function flushPendingEnds() {
  if (retrying) return;
  retrying = true;
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      const pending = await loadJson<PendingEnd[]>(PENDING_KEY, []);
      if (pending.length === 0) return;
      const [first, ...rest] = pending;
      try {
        await api.endSession(first.id, first.reason);
        await saveJson(PENDING_KEY, rest);
      } catch (err) {
        // 404 means the session is gone; drop it. Anything else: wait and retry.
        if ((err as { status?: number }).status === 404) await saveJson(PENDING_KEY, rest);
        else await new Promise((r) => setTimeout(r, Math.min(30_000, 2000 * (attempt + 1))));
      }
    }
  } finally {
    retrying = false;
  }
}
