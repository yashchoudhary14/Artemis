import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const dbFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "safewalk.db");
export const db = new DatabaseSync(dbFile);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export let failures = 0;
export function check(label: string, ok: boolean, detail: unknown = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  -> ${JSON.stringify(detail)}`}`);
}

export async function call(method: string, url: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (body) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: (await res.json()) as any };
}

// Read-only peeks at the server's DB to verify what was (not) sent.
export const alertsFor = (sessionId: string) =>
  db.prepare("SELECT type, message FROM alerts WHERE session_id = ? ORDER BY created_at").all(sessionId) as {
    type: string;
    message: string;
  }[];
export const sessionRow = (id: string) => db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as any;
export const locationCount = (id: string) =>
  (db.prepare("SELECT COUNT(*) AS n FROM locations WHERE session_id = ?").get(id) as { n: number }).n;

export async function newUser(name: string): Promise<string> {
  const u = await call("POST", "/users", undefined, { name });
  await call("POST", "/contacts", u.body.token, { name: "Mum" });
  await call("POST", "/contacts", u.body.token, { name: "Riya", tier: "wider" });
  return u.body.token;
}

// Guwahati coordinates (demo location).
export const heartbeat = (token: string, id: string, extra: object = {}) =>
  call("POST", `/sessions/${id}/heartbeat`, token, { lat: 26.1445, lng: 91.7362, battery: 64, inSafeZone: false, ...extra });
