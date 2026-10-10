import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";
import { api } from "./api";
import { batteryPercent, currentPosition, ensureForegroundLocation, stateFor } from "./geo";
import { loadActive, saveActive, sessionStore } from "./session";
import { insideZoneStore, loadZones, zoneAt, zonesStore } from "./zones";

// Heartbeats: every 15 s on a walk / in uneasy mode, every 5 s in panic mode.
// The clock is an expo-location background task with a foreground service, because JS timers
// stop when the app is in the background. A JS interval also runs while the app is open.

export const HEARTBEAT_TASK = "safewalk-heartbeat";
export const WALK_INTERVAL_MS = 15_000;
export const PANIC_INTERVAL_MS = 5_000;

let lastBeatAt = 0;
let intervalMs = WALK_INTERVAL_MS;
let fgTimer: ReturnType<typeof setInterval> | null = null;

TaskManager.defineTask(HEARTBEAT_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  await beat(locations?.[locations.length - 1]);
});

export async function beat(loc?: Location.LocationObject | null, force = false): Promise<void> {
  const active = sessionStore.get() ?? (await loadActive());
  if (!active) {
    await stopTracking();
    return;
  }
  const now = Date.now();
  if (!force && now - lastBeatAt < intervalMs * 0.6) return; // task + JS timer: don't double-send
  lastBeatAt = now;

  const position = loc ?? (await currentPosition(4000));
  const zones = zonesStore.get().length ? zonesStore.get() : await loadZones();
  // Panic ignores safe zones (the user asked for help). Otherwise the check runs on the phone only.
  const zone = position && !active.panic ? zoneAt(position.coords.latitude, position.coords.longitude, zones) : undefined;
  insideZoneStore.set({ inside: Boolean(zone), zoneName: zone?.name ?? null });

  const battery = await batteryPercent();
  try {
    if (zone || !position) {
      // Safety rule 6: inside a safe zone no coordinates leave the phone.
      await api.heartbeat(active.id, { inSafeZone: Boolean(zone), battery });
    } else {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      const state = await stateFor(lat, lng);
      const res = await api.heartbeat(active.id, {
        lat,
        lng,
        accuracy: accuracy ?? undefined,
        battery,
        state: state ?? undefined,
        inSafeZone: false,
      });
      if (!res.active) await saveActive(null);
    }
  } catch {
    // No network: the server's dead man's switch covers this. Try again next tick.
  }
}

export async function startTracking(ms: number = WALK_INTERVAL_MS): Promise<{ background: boolean }> {
  intervalMs = ms;
  lastBeatAt = 0;
  if (!(await ensureForegroundLocation())) throw new Error("Location permission is needed to share your walk.");
  let background = false;
  try {
    const bg = await Location.getBackgroundPermissionsAsync();
    background = bg.granted || (await Location.requestBackgroundPermissionsAsync()).granted;
  } catch {
    background = false;
  }
  try {
    if (await Location.hasStartedLocationUpdatesAsync(HEARTBEAT_TASK)) await Location.stopLocationUpdatesAsync(HEARTBEAT_TASK);
    await Location.startLocationUpdatesAsync(HEARTBEAT_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: ms,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        // Neutral wording: the same notification for every kind of session.
        notificationTitle: "SafeWalk",
        notificationBody: "Your circle can see your walk.",
        notificationColor: "#8B5CF6",
        killServiceOnDestroy: false,
      },
    });
  } catch {
    // Background updates refused: the foreground timer below still runs while the app is open.
  }
  startForegroundTimer();
  void beat(null, true);
  return { background };
}

function startForegroundTimer() {
  if (fgTimer) clearInterval(fgTimer);
  fgTimer = setInterval(() => {
    if (AppState.currentState === "active") void beat();
  }, intervalMs);
}

export async function stopTracking() {
  if (fgTimer) clearInterval(fgTimer);
  fgTimer = null;
  insideZoneStore.set({ inside: false, zoneName: null });
  try {
    if (await Location.hasStartedLocationUpdatesAsync(HEARTBEAT_TASK)) await Location.stopLocationUpdatesAsync(HEARTBEAT_TASK);
  } catch {
    // already stopped
  }
}

// After an app restart: resume heartbeats for a session that was running.
export async function resumeTrackingIfActive() {
  const active = await loadActive();
  if (active) await startTracking(active.panic ? PANIC_INTERVAL_MS : WALK_INTERVAL_MS).catch(() => undefined);
}
