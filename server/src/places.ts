import { config } from "./config.js";
import { log } from "./log.js";

// Safety rule 3: hospitals and police stations come ONLY from the Google Places API (New).
export type PlaceType = "hospital" | "police";

export interface Place {
  name: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceM: number;
  mapsUrl: string;
  source: "Google Maps";
}

interface ApiPlace {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
}

const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; places: Place[] }>();

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Nearest places of one type, sorted by distance. Results are cached per ~100 m grid cell.
export async function findNearby(type: PlaceType, lat: number, lng: number, max = 5): Promise<Place[]> {
  if (!config.googleMapsApiKey) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  const key = `${type}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places.slice(0, max);

  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": config.googleMapsApiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 10,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 10000 } },
    }),
  });
  const body = (await res.json()) as { places?: ApiPlace[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Google Places: ${body.error?.message ?? res.status}`);

  const places: Place[] = (body.places ?? [])
    .filter((p) => p.location && p.displayName?.text)
    .map((p) => {
      const pos = { lat: p.location!.latitude, lng: p.location!.longitude };
      return {
        name: p.displayName!.text!,
        address: p.formattedAddress ?? null,
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        ...pos,
        distanceM: distanceM({ lat, lng }, pos),
        mapsUrl: p.googleMapsUri ?? `https://maps.google.com/?q=${pos.lat},${pos.lng}`,
        source: "Google Maps" as const,
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
  cache.set(key, { at: Date.now(), places });
  log.info(`places: ${places.length} ${type} near ${lat.toFixed(4)},${lng.toFixed(4)}`);
  return places.slice(0, max);
}
