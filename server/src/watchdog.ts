import { config } from "./config.js";
import { getAll, run, type SessionRow } from "./db.js";
import { fireAlert } from "./alerts.js";
import { log } from "./log.js";

const TICK_MS = 5000;

// Runs every 5 s on the server, so alerts go out even if the phone is dead.
export async function checkSessions(now = Date.now()): Promise<void> {
  const sessions = getAll<SessionRow>("SELECT * FROM sessions WHERE status IN ('active', 'duress')");
  for (const s of sessions) {
    // Check-in timer ran out (duress sessions have already alerted).
    if (s.status === "active" && s.timer_ends_at != null && !s.timer_alerted && now >= s.timer_ends_at) {
      run("UPDATE sessions SET timer_alerted = 1 WHERE id = ?", s.id);
      await fireAlert(s, "timer");
    }
    // Dead man's switch. Off inside a safe zone (safety rule 6).
    const silentMs = now - s.last_heartbeat_at;
    if (!s.in_safe_zone && !s.lost_contact && silentMs > config.heartbeatTimeoutSeconds * 1000) {
      run("UPDATE sessions SET lost_contact = 1 WHERE id = ?", s.id);
      await fireAlert(s, "lost_contact");
    }
  }
}

export function startWatchdog(): NodeJS.Timeout {
  let running = false;
  return setInterval(async () => {
    if (running) return; // never overlap ticks, so an alert can't be sent twice
    running = true;
    try {
      await checkSessions();
    } catch (err) {
      log.error(`watchdog error: ${(err as Error).message}`);
    } finally {
      running = false;
    }
  }, TICK_MS);
}
