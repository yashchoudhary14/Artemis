import { Linking } from "react-native";
import { api, type Helpline } from "./api";
import { cachedState, snapshot } from "./geo";
import { loadJson, saveJson } from "./storage";

// Helplines come only from the server's data/helplines.json (every entry has a source URL).
// The last list is cached so the Help tab and fast-dial still work offline.
const CACHE_KEY = "sw.helplines";

export interface HelplineCache {
  state: string | null;
  ambulanceNumber: string;
  helplines: Helpline[];
  fetchedAt: number;
}

export async function cachedHelplines(): Promise<HelplineCache | null> {
  return loadJson<HelplineCache | null>(CACHE_KEY, null);
}

export async function fetchHelplines(state: string | null): Promise<HelplineCache> {
  const res = await api.helplines(state);
  const cache = { ...res, fetchedAt: Date.now() };
  await saveJson(CACHE_KEY, cache);
  return cache;
}

// The number to dial: the state's ambulance number from the JSON (108 in Assam), else 112.
export async function ambulanceNumber(): Promise<string> {
  const cache = await cachedHelplines();
  const state = await cachedState();
  if (cache && (cache.state ?? null) === (state ?? null)) return cache.ambulanceNumber;
  return "112";
}

export function dial(number: string) {
  return Linking.openURL(`tel:${number}`);
}

// One tap: the dialler opens at once, and the inner circle is told at the same moment.
export async function medicalFastDial(): Promise<{ number: string; notify: Promise<unknown> }> {
  const number = await ambulanceNumber();
  void dial(number);
  const notify = snapshot().then((where) => api.medical(where));
  return { number, notify };
}
