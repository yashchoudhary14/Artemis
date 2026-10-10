import { getServerUrl, getToken } from "./storage";

// Typed client for the Artemis server (see docs/API.md).

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const base = await getServerUrl();
  if (!base) throw new ApiError("Set the server address in Rise → Settings first.", 0);
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) headers["content-type"] = "application/json";
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new ApiError(json.error ?? `Server error ${res.status}`, res.status);
    return json as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError((err as Error).name === "AbortError" ? "The server did not answer in time." : "Can't reach the server. Check your internet.", 0);
  } finally {
    clearTimeout(timer);
  }
}

// ---- Types (mirror the server JSON) ----

export interface Contact {
  id: string;
  name: string;
  tier: "inner" | "wider";
  position: number;
  linkCode: string;
  linkUrl: string | null;
  linked: boolean;
}

export interface Medical {
  bloodGroup: string | null;
  allergies: string | null;
  conditions: string | null;
}

export interface Me {
  id: string;
  name: string;
  escalationWaitSeconds: number;
  contacts: Contact[];
  medical: Medical;
  email: string | null;
  emailVerified: boolean;
  photoUrl: string | null;
}

export interface StartedSession {
  sessionId: string;
  guardianUrl: string;
  timerEndsAt?: number | null;
}

export interface Helpline {
  number: string;
  purpose: string;
  coverage: string;
  sourceUrl: string;
  dateVerified: string;
  ambulance?: boolean;
}

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

export interface Delivery {
  name: string;
  /** alert | update | ai | escalation */
  kind: string;
  ok: boolean;
  error: string | null;
  at: number;
}

export interface SessionStatus {
  status: "active" | "ended";
  kind: string;
  alerts: { type: string; at: number; message?: string }[];
  acks: { name: string; at: number }[];
  escalation: { step: number; level: number; done: boolean; doneReason: string | null; nextAt: number | null } | null;
  agent: { kind: string; text: string; recipients: string[]; at: number }[];
  deliveries: Delivery[];
  audioChunks: number;
}

export interface Location {
  lat?: number;
  lng?: number;
  accuracy?: number;
  battery?: number;
  state?: string;
}

export interface Briefing {
  tips: string[];
  byAi: boolean;
  source: string;
}

export interface IncidentReport {
  summary: string;
  timeline: { time: string; text: string }[];
  byAi: boolean;
  generatedAt: number;
}

// ---- Endpoints ----

export const api = {
  health: () => request<{ ok: boolean }>("GET", "/health", undefined, { auth: false, timeoutMs: 6000 }),
  createUser: (name: string, escalationWaitSeconds?: number) =>
    request<Me & { token: string }>("POST", "/users", { name, escalationWaitSeconds }, { auth: false }),
  me: () => request<Me>("GET", "/me"),
  patchMe: (p: { name?: string; escalationWaitSeconds?: number }) => request<Me>("PATCH", "/me", p),
  setMedical: (m: { bloodGroup?: string; allergies?: string; conditions?: string }) => request<Me>("PUT", "/me/medical", m),
  addContact: (name: string, tier: "inner" | "wider") => request<Contact>("POST", "/contacts", { name, tier }),
  deleteContact: (id: string) => request<{ ok: true }>("DELETE", `/contacts/${id}`),

  startSession: (b: { kind?: "walk" | "suspicion"; destination?: string; timerMinutes?: number; battery?: number; state?: string; inSafeZone: boolean; buddyMatchId?: string }) =>
    request<StartedSession>("POST", "/sessions", b),
  heartbeat: (id: string, b: Location & { inSafeZone: boolean }) =>
    request<{ ok: true; active: boolean }>("POST", `/sessions/${id}/heartbeat`, b, { timeoutMs: 10000 }),
  endSession: (id: string, reason: "cancel" | "duress") => request<{ ok: true }>("POST", `/sessions/${id}/end`, { reason }),
  keyword: (id: string, b: Location & { keyword: string; snippets: string[] }) =>
    request<StartedSession & { ok: true }>("POST", `/sessions/${id}/keyword`, b),
  panic: (b: Location & { sessionId?: string }) => request<StartedSession & { ok: true }>("POST", "/panic", b),
  status: (id: string) => request<SessionStatus>("GET", `/sessions/${id}/status`),

  helplines: (state?: string | null) =>
    request<{ state: string | null; ambulanceNumber: string; helplines: Helpline[] }>(
      "GET",
      `/helplines${state ? `?state=${encodeURIComponent(state)}` : ""}`,
      undefined,
      { auth: false },
    ),
  nearby: (type: "hospital" | "police", lat: number, lng: number) =>
    request<{ source: string; places: Place[] }>("GET", `/nearby?type=${type}&lat=${lat}&lng=${lng}`),
  briefing: (b: { lat?: number; lng?: number; destination?: string; timerMinutes?: number }) =>
    request<Briefing>("POST", "/briefing", b, { timeoutMs: 40000 }),
  report: (id: string) => request<IncidentReport>("GET", `/sessions/${id}/report`, undefined, { timeoutMs: 40000 }),
  medical: (b: Location) => request<StartedSession & { ok: true; ambulanceNumber: string }>("POST", "/medical", b),
};

// Audio chunk upload for panic mode. Retries are safe: the server ignores a repeated seq.
export async function uploadAudioChunk(sessionId: string, seq: number, uri: string, startedAt: number): Promise<void> {
  const form = new FormData();
  const ext = uri.split(".").pop()?.toLowerCase() ?? "m4a";
  const type = ext === "wav" ? "audio/wav" : ext === "3gp" ? "audio/3gpp" : "audio/mp4";
  // React Native's FormData accepts { uri, name, type } for files on disk.
  form.append("file", { uri, name: `chunk-${seq}.${ext}`, type } as unknown as Blob);
  await request("POST", `/sessions/${sessionId}/audio?seq=${seq}&startedAt=${startedAt}`, form, { timeoutMs: 30000 });
}
