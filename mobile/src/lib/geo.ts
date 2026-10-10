import * as Battery from "expo-battery";
import * as Location from "expo-location";
import { loadJson, saveJson } from "./storage";

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function batteryPercent(): Promise<number | undefined> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : undefined;
  } catch {
    return undefined;
  }
}

export async function ensureForegroundLocation(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.granted) return true;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

// Best-effort current position: a fresh fix if it comes quickly, else the last known one.
export async function currentPosition(timeoutMs = 6000): Promise<Location.LocationObject | null> {
  try {
    if (!(await ensureForegroundLocation())) return null;
    const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    return (await Promise.race([fresh, timeout])) ?? (await Location.getLastKnownPositionAsync());
  } catch {
    return Location.getLastKnownPositionAsync().catch(() => null);
  }
}

// Indian state from reverse geocoding, cached (used for state helplines and 108 vs 112).
const STATE_KEY = "sw.state";
let stateMem: { state: string | null; at: number } | null = null;

export async function cachedState(): Promise<string | null> {
  if (!stateMem) stateMem = await loadJson(STATE_KEY, { state: null as string | null, at: 0 });
  return stateMem.state;
}

export async function stateFor(lat: number, lng: number): Promise<string | null> {
  const cached = stateMem ?? (await loadJson(STATE_KEY, { state: null as string | null, at: 0 }));
  if (cached.state && Date.now() - cached.at < 10 * 60_000) return cached.state;
  try {
    const [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const state = addr?.region ?? null;
    stateMem = { state, at: Date.now() };
    await saveJson(STATE_KEY, stateMem);
    return state;
  } catch {
    return cached.state;
  }
}

// A short street address to read out to an ambulance operator.
export async function addressFor(lat: number, lng: number): Promise<string | null> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!a) return null;
    const parts = [a.name, a.street, a.district ?? a.subregion, a.city, a.region, a.postalCode].filter(
      (p, i, arr): p is string => Boolean(p) && arr.indexOf(p) === i,
    );
    return parts.join(", ") || a.formattedAddress || null;
  } catch {
    return null;
  }
}

// Location + battery + state in one go, for emergency calls.
export async function snapshot(): Promise<{ lat?: number; lng?: number; accuracy?: number; battery?: number; state?: string }> {
  const [pos, battery] = await Promise.all([currentPosition(), batteryPercent()]);
  if (!pos) return { battery, state: (await cachedState()) ?? undefined };
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  const state = await stateFor(lat, lng);
  return { lat, lng, accuracy: accuracy ?? undefined, battery, state: state ?? undefined };
}
