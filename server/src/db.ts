import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/data/ is gitignored. Delete safewalk.db to start fresh.
export const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
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

-- Words the phone heard just before a keyword trigger (on-device speech recognition).
CREATE TABLE IF NOT EXISTS transcript_snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  at INTEGER NOT NULL
);

-- Panic-mode audio, 10 s per chunk. (session_id, seq) is unique so phone retries never duplicate.
CREATE TABLE IF NOT EXISTS audio_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  file TEXT NOT NULL,
  mime TEXT NOT NULL,
  started_at INTEGER,
  received_at INTEGER NOT NULL,
  transcript TEXT,
  transcribed_at INTEGER,
  UNIQUE (session_id, seq)
);

-- Escalation ladder state, driven by the watchdog so it survives restarts.
-- step = index of the next inner-circle contact; step >= contact count means "recommend 112".
CREATE TABLE IF NOT EXISTS escalations (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  next_at INTEGER NOT NULL,
  running INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  done_reason TEXT,
  started_at INTEGER NOT NULL
);

-- Everything the AI agent did, for the guardian page timeline and the demo.
-- Every message SafeWalk tried to send for a session, per contact, and whether it got through.
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  ok INTEGER NOT NULL,
  error TEXT,
  at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  recipient TEXT,
  at INTEGER NOT NULL
);
`);

// Columns added after Phase 1. ALTER TABLE only if missing, so old databases keep working.
function addColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
addColumn("users", "blood_group", "TEXT");
addColumn("users", "allergies", "TEXT");
addColumn("users", "conditions", "TEXT");
addColumn("users", "email", "TEXT");
addColumn("users", "email_verified", "INTEGER NOT NULL DEFAULT 0");
addColumn("users", "photo_file", "TEXT");
addColumn("users", "photo_token", "TEXT");
addColumn("sessions", "keyword", "TEXT");
addColumn("sessions", "panic_at", "INTEGER");
addColumn("sessions", "battery_alerted", "INTEGER NOT NULL DEFAULT 0");
addColumn("sessions", "buddy_match_id", "TEXT");
// Indian state name from the phone's reverse geocode (for state helplines), e.g. "Assam".
addColumn("sessions", "state", "TEXT");

export interface UserRow {
  id: string;
  token: string;
  name: string;
  escalation_wait_seconds: number;
  created_at: number;
  blood_group: string | null;
  allergies: string | null;
  conditions: string | null;
  email: string | null;
  email_verified: number;
  photo_file: string | null;
  photo_token: string | null;
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

export type SessionKind = "walk" | "suspicion" | "panic" | "medical";

export interface SessionRow {
  id: string;
  user_id: string;
  kind: SessionKind;
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
  keyword: string | null;
  panic_at: number | null;
  battery_alerted: number;
  buddy_match_id: string | null;
  state: string | null;
}

export interface AudioChunkRow {
  id: number;
  session_id: string;
  seq: number;
  file: string;
  mime: string;
  started_at: number | null;
  received_at: number;
  transcript: string | null;
  transcribed_at: number | null;
}

export interface EscalationRow {
  session_id: string;
  trigger: string;
  step: number;
  level: number;
  next_at: number;
  running: number;
  done: number;
  done_reason: string | null;
  started_at: number;
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
