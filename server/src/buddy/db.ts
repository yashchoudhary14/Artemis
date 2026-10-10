import { db } from "../db.js";

// Walking-buddy tables (institute-only sign-up, walk requests, matches).
db.exec(`
CREATE TABLE IF NOT EXISTS email_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- status: open | matched | cancelled
CREATE TABLE IF NOT EXISTS buddy_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_area TEXT NOT NULL,
  dest_area TEXT NOT NULL,
  depart_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- status: proposed | accepted | declined
CREATE TABLE IF NOT EXISTS buddy_matches (
  id TEXT PRIMARY KEY,
  request_a TEXT NOT NULL,
  request_b TEXT NOT NULL,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  accepted_a INTEGER NOT NULL DEFAULT 0,
  accepted_b INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

export interface BuddyRequestRow {
  id: string;
  user_id: string;
  start_area: string;
  dest_area: string;
  depart_at: number;
  status: "open" | "matched" | "cancelled";
  created_at: number;
}

export interface BuddyMatchRow {
  id: string;
  request_a: string;
  request_b: string;
  user_a: string;
  user_b: string;
  accepted_a: number;
  accepted_b: number;
  status: "proposed" | "accepted" | "declined";
  created_at: number;
}
