import { createHash, randomInt, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatTime, innerContacts } from "../alerts.js";
import { config } from "../config.js";
import { dataDir, getAll, getOne, run, type UserRow } from "../db.js";
import { log } from "../log.js";
import { notify } from "../notify/index.js";
import { authUser, newToken, photoUrl } from "../routes/common.js";
import { CAMPUS_AREAS, isArea } from "./areas.js";
import { type BuddyMatchRow, type BuddyRequestRow } from "./db.js";

const photoDir = path.join(dataDir, "photos");
const MATCH_WINDOW_MS = 15 * 60_000;
const CODE_TTL_MS = 10 * 60_000;

const emailBody = z.object({ email: z.string().trim().toLowerCase().email().max(120) });
const verifyBody = emailBody.extend({ code: z.string().trim().regex(/^\d{6}$/) });
const requestBody = z.object({
  startArea: z.string().refine(isArea, "unknown area"),
  destArea: z.string().refine(isArea, "unknown area"),
  departAt: z.number().int(),
});

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const userById = (id: string) => getOne<UserRow>("SELECT * FROM users WHERE id = ?", id)!;
const firstName = (name: string) => name.split(/\s+/)[0];

function myOpenRequest(userId: string) {
  return getOne<BuddyRequestRow>(
    "SELECT * FROM buddy_requests WHERE user_id = ? AND status IN ('open', 'matched') ORDER BY created_at DESC LIMIT 1",
    userId,
  );
}

function matchFor(requestId: string) {
  return getOne<BuddyMatchRow>(
    "SELECT * FROM buddy_matches WHERE (request_a = ? OR request_b = ?) AND status != 'declined' ORDER BY created_at DESC LIMIT 1",
    requestId,
    requestId,
  );
}

function matchJson(m: BuddyMatchRow, me: string) {
  const iAmA = m.user_a === me;
  const buddy = userById(iAmA ? m.user_b : m.user_a);
  const req = getOne<BuddyRequestRow>("SELECT * FROM buddy_requests WHERE id = ?", iAmA ? m.request_a : m.request_b)!;
  return {
    id: m.id,
    status: m.status,
    iAccepted: Boolean(iAmA ? m.accepted_a : m.accepted_b),
    theyAccepted: Boolean(iAmA ? m.accepted_b : m.accepted_a),
    buddy: { name: buddy.name, photoUrl: photoUrl(buddy), email: buddy.email },
    startArea: req.start_area,
    destArea: req.dest_area,
    departAt: req.depart_at,
  };
}

function stateJson(user: UserRow) {
  const req = myOpenRequest(user.id);
  const m = req ? matchFor(req.id) : undefined;
  return {
    email: user.email,
    verified: Boolean(user.email_verified),
    photoUrl: photoUrl(user),
    domain: config.instituteEmailDomain,
    request: req ? { id: req.id, startArea: req.start_area, destArea: req.dest_area, departAt: req.depart_at, status: req.status } : null,
    match: m ? matchJson(m, user.id) : null,
  };
}

// Same start + destination, departure within ±15 min, another verified user, not already matched.
function tryMatch(req: BuddyRequestRow): BuddyMatchRow | undefined {
  const other = getOne<BuddyRequestRow>(
    `SELECT r.* FROM buddy_requests r JOIN users u ON u.id = r.user_id
     WHERE r.status = 'open' AND r.user_id != ? AND u.email_verified = 1
       AND r.start_area = ? AND r.dest_area = ? AND ABS(r.depart_at - ?) <= ?
     ORDER BY ABS(r.depart_at - ?) LIMIT 1`,
    req.user_id, req.start_area, req.dest_area, req.depart_at, MATCH_WINDOW_MS, req.depart_at,
  );
  if (!other) return undefined;
  const id = randomUUID();
  run(
    "INSERT INTO buddy_matches (id, request_a, request_b, user_a, user_b, status, created_at) VALUES (?, ?, ?, ?, ?, 'proposed', ?)",
    id, other.id, req.id, other.user_id, req.user_id, Date.now(),
  );
  run("UPDATE buddy_requests SET status = 'matched' WHERE id IN (?, ?)", other.id, req.id);
  log.info(`buddy match ${id}: ${other.user_id} + ${req.user_id} (${req.start_area} -> ${req.dest_area})`);
  return getOne<BuddyMatchRow>("SELECT * FROM buddy_matches WHERE id = ?", id);
}

// Both accepted: each person's inner circle gets the buddy's name and photo (template, no AI).
async function announceMatch(m: BuddyMatchRow) {
  const req = getOne<BuddyRequestRow>("SELECT * FROM buddy_requests WHERE id = ?", m.request_a)!;
  const pairs: [string, string][] = [
    [m.user_a, m.user_b],
    [m.user_b, m.user_a],
  ];
  for (const [me, them] of pairs) {
    const user = userById(me);
    const buddy = userById(them);
    const photo = photoUrl(buddy);
    const text =
      `SafeWalk: ${user.name} is walking with a buddy from ${req.start_area} to ${req.dest_area} (leaving around ${formatTime(req.depart_at)}). ` +
      `Buddy: ${buddy.name}, verified institute email ${buddy.email ?? ""}.${photo ? ` Photo: ${photo}` : ""}`;
    await Promise.all(innerContacts(me).map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, text)));
  }
}

export async function buddyRoutes(app: FastifyInstance) {
  app.get("/buddy/areas", async () => ({ areas: CAMPUS_AREAS }));

  app.get("/buddy/me", async (req, reply) => {
    const user = authUser(req, reply);
    return user && stateJson(user);
  });

  // One-time code to the institute email. Allowed shortcut: the code is printed in the server log.
  app.post("/buddy/email/start", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const { email } = emailBody.parse(req.body);
    const domain = email.split("@")[1];
    if (config.instituteEmailDomain && domain !== config.instituteEmailDomain) {
      return reply.code(400).send({ error: `Use your @${config.instituteEmailDomain} email` });
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    run(
      `INSERT INTO email_codes (user_id, email, code_hash, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
      user.id, email, hash(code), Date.now() + CODE_TTL_MS,
    );
    log.warn(`EMAIL CODE for ${email}: ${code} (email sending not set up; read it from this log)`);
    return { ok: true, email };
  });

  app.post("/buddy/email/verify", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const { email, code } = verifyBody.parse(req.body);
    const row = getOne<{ email: string; code_hash: string; expires_at: number; attempts: number }>(
      "SELECT * FROM email_codes WHERE user_id = ?",
      user.id,
    );
    if (!row || row.email !== email || row.expires_at < Date.now() || row.attempts >= 5) {
      return reply.code(400).send({ error: "Code expired. Ask for a new one." });
    }
    if (row.code_hash !== hash(code)) {
      run("UPDATE email_codes SET attempts = attempts + 1 WHERE user_id = ?", user.id);
      return reply.code(400).send({ error: "Wrong code" });
    }
    run("UPDATE users SET email = ?, email_verified = 1 WHERE id = ?", email, user.id);
    run("DELETE FROM email_codes WHERE user_id = ?", user.id);
    return stateJson(userById(user.id));
  });

  // Profile photo (shown to the buddy's family). Served at /photos/<random token>.
  app.post("/buddy/photo", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const file = await req.file();
    if (!file || !file.mimetype.startsWith("image/")) return reply.code(400).send({ error: "send an image" });
    const ext = file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg";
    mkdirSync(photoDir, { recursive: true });
    const name = `${user.id}${ext}`;
    await pipeline(file.file, createWriteStream(path.join(photoDir, name)));
    if (file.file.truncated) return reply.code(413).send({ error: "photo too large" });
    run("UPDATE users SET photo_file = ?, photo_token = ? WHERE id = ?", name, newToken(12), user.id);
    return stateJson(userById(user.id));
  });

  app.get<{ Params: { token: string } }>("/photos/:token", async (req, reply) => {
    const u = getOne<UserRow>("SELECT * FROM users WHERE photo_token = ?", req.params.token);
    const file = u?.photo_file ? path.join(photoDir, u.photo_file) : "";
    if (!u || !existsSync(file)) return reply.code(404).send({ error: "not found" });
    const type = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return reply.type(type).send(createReadStream(file));
  });

  // People planning a walk soon (for the "Departures" list). First names only.
  app.get("/buddy/departures", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const now = Date.now();
    const rows = getAll<BuddyRequestRow & { name: string }>(
      `SELECT r.*, u.name FROM buddy_requests r JOIN users u ON u.id = r.user_id
       WHERE r.status = 'open' AND r.user_id != ? AND u.email_verified = 1 AND r.depart_at BETWEEN ? AND ?
       ORDER BY r.depart_at LIMIT 30`,
      user.id, now - MATCH_WINDOW_MS, now + 6 * 3600_000,
    );
    return {
      departures: rows.map((r) => ({
        id: r.id,
        name: firstName(r.name),
        startArea: r.start_area,
        destArea: r.dest_area,
        departAt: r.depart_at,
      })),
    };
  });

  app.post("/buddy/requests", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    if (!user.email_verified) return reply.code(403).send({ error: "Verify your institute email first" });
    const body = requestBody.parse(req.body);
    if (body.startArea === body.destArea) return reply.code(400).send({ error: "Start and destination must differ" });
    // One request at a time: replace any older open request.
    run("UPDATE buddy_requests SET status = 'cancelled' WHERE user_id = ? AND status = 'open'", user.id);
    const r: BuddyRequestRow = {
      id: randomUUID(), user_id: user.id, start_area: body.startArea, dest_area: body.destArea,
      depart_at: body.departAt, status: "open", created_at: Date.now(),
    };
    run(
      "INSERT INTO buddy_requests (id, user_id, start_area, dest_area, depart_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      r.id, r.user_id, r.start_area, r.dest_area, r.depart_at, r.status, r.created_at,
    );
    tryMatch(r);
    return stateJson(user);
  });

  app.delete("/buddy/requests", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    run("UPDATE buddy_requests SET status = 'cancelled' WHERE user_id = ? AND status = 'open'", user.id);
    return stateJson(user);
  });

  app.post<{ Params: { id: string } }>("/buddy/matches/:id/accept", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const m = getOne<BuddyMatchRow>("SELECT * FROM buddy_matches WHERE id = ? AND (user_a = ? OR user_b = ?)", req.params.id, user.id, user.id);
    if (!m || m.status === "declined") return reply.code(404).send({ error: "match not found" });
    run(`UPDATE buddy_matches SET ${m.user_a === user.id ? "accepted_a" : "accepted_b"} = 1 WHERE id = ?`, m.id);
    const now = getOne<BuddyMatchRow>("SELECT * FROM buddy_matches WHERE id = ?", m.id)!;
    if (now.accepted_a && now.accepted_b && now.status === "proposed") {
      run("UPDATE buddy_matches SET status = 'accepted' WHERE id = ?", m.id);
      await announceMatch(now);
    }
    return stateJson(user);
  });

  app.post<{ Params: { id: string } }>("/buddy/matches/:id/decline", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const m = getOne<BuddyMatchRow>("SELECT * FROM buddy_matches WHERE id = ? AND (user_a = ? OR user_b = ?)", req.params.id, user.id, user.id);
    if (!m) return reply.code(404).send({ error: "match not found" });
    run("UPDATE buddy_matches SET status = 'declined' WHERE id = ?", m.id);
    // The other person goes back to waiting; my request is closed.
    const mine = m.user_a === user.id ? m.request_a : m.request_b;
    const theirs = m.user_a === user.id ? m.request_b : m.request_a;
    run("UPDATE buddy_requests SET status = 'cancelled' WHERE id = ?", mine);
    run("UPDATE buddy_requests SET status = 'open' WHERE id = ?", theirs);
    return stateJson(user);
  });
}
