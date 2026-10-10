import { api } from "./api";
import { batteryPercent, currentPosition, stateFor } from "./geo";
import { panicStore, stopPanicLocal } from "./panic";
import { saveActive, sendEnd, sessionStore, type ActiveSession } from "./session";
import { checkPin } from "./storage";
import { stopListening } from "./suspicion";
import { startTracking, stopTracking, WALK_INTERVAL_MS } from "./tracking";
import { loadZones, zoneAt } from "./zones";

async function startInfo() {
  const [pos, battery, zones] = await Promise.all([currentPosition(5000), batteryPercent(), loadZones()]);
  const inSafeZone = pos ? Boolean(zoneAt(pos.coords.latitude, pos.coords.longitude, zones)) : false;
  const state = pos && !inSafeZone ? await stateFor(pos.coords.latitude, pos.coords.longitude) : null;
  return { battery, inSafeZone, state: state ?? undefined };
}

export async function startWalk(opts: { destination?: string; timerMinutes?: number; buddyMatchId?: string }): Promise<ActiveSession> {
  const info = await startInfo();
  const res = await api.startSession({ kind: "walk", ...opts, ...info });
  const session: ActiveSession = {
    id: res.sessionId,
    kind: "walk",
    guardianUrl: res.guardianUrl,
    startedAt: Date.now(),
    destination: opts.destination,
    timerEndsAt: res.timerEndsAt ?? null,
    buddyMatchId: opts.buddyMatchId,
  };
  await saveActive(session);
  await startTracking(WALK_INTERVAL_MS);
  return session;
}

export const SUSPICION_MINUTES = 30;

export async function startSuspicionSession(): Promise<ActiveSession> {
  const existing = sessionStore.get();
  if (existing) {
    const s = { ...existing, suspicionEndsAt: Date.now() + SUSPICION_MINUTES * 60_000 };
    await saveActive(s);
    return s;
  }
  const info = await startInfo();
  const res = await api.startSession({ kind: "suspicion", ...info });
  const session: ActiveSession = {
    id: res.sessionId,
    kind: "suspicion",
    guardianUrl: res.guardianUrl,
    startedAt: Date.now(),
    suspicionEndsAt: Date.now() + SUSPICION_MINUTES * 60_000,
  };
  await saveActive(session);
  await startTracking(WALK_INTERVAL_MS);
  return session;
}

/**
 * The one way to end a session from the phone. Safety rule 7: the real PIN and the duress PIN
 * produce exactly the same result on screen ("ended"); only the server learns the difference.
 */
export async function endWithPin(pin: string): Promise<"ended" | "wrong" | "unset"> {
  const result = await checkPin(pin);
  if (result === "wrong" || result === "unset") return result;
  const active = sessionStore.get();
  const panicSession = panicStore.get().sessionId;
  stopListening();
  stopPanicLocal();
  await stopTracking();
  await saveActive(null);
  const ids = new Set([active?.id, panicSession].filter((x): x is string => Boolean(x)));
  for (const id of ids) void sendEnd(id, result === "ok" ? "cancel" : "duress");
  return "ended";
}

// Uneasy mode timed out with nothing heard: close quietly (no alert was ever raised).
export async function endSuspicionQuietly() {
  const active = sessionStore.get();
  stopListening();
  if (!active || active.panic) return;
  if (active.kind !== "suspicion") {
    // Uneasy mode was added on top of a walk: the walk keeps going.
    await saveActive({ ...active, suspicionEndsAt: undefined });
    return;
  }
  await stopTracking();
  await saveActive(null);
  void sendEnd(active.id, "cancel");
}
