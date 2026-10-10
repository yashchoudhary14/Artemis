import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { DEMO } from "@/demo";

// Non-secret settings live in AsyncStorage; the server token and PINs in SecureStore.
// PINs never leave the phone: the server is only told "cancel" or "duress".

const KEYS = {
  serverUrl: "sw.serverUrl.v2",
  token: "sw_token",
  pin: "sw_pin",
  duressPin: "sw_duress_pin",
};

// A URL saved in Rise wins, unless the demo tunnel URL baked into the build has changed since.
export async function getServerUrl(): Promise<string> {
  const saved = await loadJson<{ url: string; forDefault: string } | null>(KEYS.serverUrl, null);
  if (saved?.url && saved.forDefault === DEMO.serverUrl) return saved.url;
  return DEMO.enabled ? DEMO.serverUrl : (saved?.url ?? "");
}

export async function setServerUrl(url: string) {
  await saveJson(KEYS.serverUrl, { url: url.trim().replace(/\/+$/, ""), forDefault: DEMO.serverUrl });
}

let tokenCache: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (tokenCache !== undefined) return tokenCache;
  tokenCache = await SecureStore.getItemAsync(KEYS.token);
  return tokenCache;
}

export async function setToken(token: string | null) {
  tokenCache = token;
  if (token) await SecureStore.setItemAsync(KEYS.token, token);
  else await SecureStore.deleteItemAsync(KEYS.token);
}

export async function getPins(): Promise<{ pin: string | null; duressPin: string | null }> {
  const [pin, duressPin] = await Promise.all([SecureStore.getItemAsync(KEYS.pin), SecureStore.getItemAsync(KEYS.duressPin)]);
  return { pin, duressPin };
}

export async function setPins(pin: string, duressPin: string) {
  await SecureStore.setItemAsync(KEYS.pin, pin);
  await SecureStore.setItemAsync(KEYS.duressPin, duressPin);
}

export type PinResult = "ok" | "duress" | "wrong" | "unset";

export async function checkPin(entered: string): Promise<PinResult> {
  const { pin, duressPin } = await getPins();
  if (!pin) return "unset";
  if (entered === pin) return "ok";
  if (duressPin && entered === duressPin) return "duress";
  return "wrong";
}

// Generic JSON helpers for small phone-only data (zones, keywords, caches, queues).
export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
