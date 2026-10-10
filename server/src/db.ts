import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/data/ is gitignored. Delete safewalk.db to start fresh.
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "safewalk.db"));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  escalation_wait_seconds INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('inner', 'wider')),
  position INTEGER NOT NULL,
  link_code TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  created_at INTEGER NOT NULL
);

-- status: active | duress (looks ended on the phone, still watched) | ended
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  destination TEXT,
  guardian_token TEXT NOT NULL UNIQUE,
  timer_ends_at INTEGER,
  timer_alerted INTEGER NOT NULL DEFAULT 0,
  in_safe_zone INTEGER NOT NULL DEFAULT 0,
  battery INTEGER,
  last_heartbeat_at INTEGER NOT NULL,
  lost_contact INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_locations_session ON locations(session_id, at);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS acks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  contact_id TEXT,
  name TEXT NOT NULL,
  at INTEGER NOT NULL
);
`);

export interface UserRow {
  id: string;
  token: string;
  name: string;
  escalation_wait_seconds: number;
  created_at: number;
}

export interface ContactRow {
  id: string;
  user_id: string;
  name: string;
  tier: "inner" | "wider";
  position: number;
  link_code: string;
  telegram_chat_id: string | null;
  created_at: number;
}

export interface SessionRow {
  id: string;
  user_id: string;
  kind: string;
  status: "active" | "duress" | "ended";
  destination: string | null;
  guardian_token: string;
  timer_ends_at: number | null;
  timer_alerted: number;
  in_safe_zone: number;
  battery: number | null;
  last_heartbeat_at: number;
  lost_contact: number;
  created_at: number;
  ended_at: number | null;
}

export interface LocationRow {
  lat: number;
  lng: number;
  accuracy: number | null;
  at: number;
}

// node:sqlite returns loosely typed rows; these helpers give them our row types.
export function getOne<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function getAll<T>(sql: string, ...params: (string | number | null)[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function run(sql: string, ...params: (string | number | null)[]) {
  return db.prepare(sql).run(...params);
}
