import { distanceM } from "./geo";
import { loadJson, saveJson } from "./storage";
import { createStore } from "./store";

// Safety rule 5: safe zones stay on the phone. They are stored here only and never sent anywhere.
export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number; // 50–500
}

const KEY = "sw.zones";

export const zonesStore = createStore<Zone[]>([]);
// Whether the last known position was inside a zone (drives "sharing paused" UI and keyword pause).
export const insideZoneStore = createStore<{ inside: boolean; zoneName: string | null }>({ inside: false, zoneName: null });

export async function loadZones(): Promise<Zone[]> {
  const zones = await loadJson<Zone[]>(KEY, []);
  zonesStore.set(zones);
  return zones;
}

export async function saveZones(zones: Zone[]) {
  zonesStore.set(zones);
  await saveJson(KEY, zones);
}

export function zoneAt(lat: number, lng: number, zones: Zone[]): Zone | undefined {
  return zones.find((z) => distanceM({ lat, lng }, z) <= z.radiusM);
}

export const isInSafeZone = () => insideZoneStore.get().inside;
