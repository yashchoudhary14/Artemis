import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getAll, getOne, run, type ContactRow, type SessionKind, type SessionRow, type UserRow } from "../db.js";
import { fireAlert, formatTime, guardianUrl, sendContactRestored } from "../alerts.js";
import { notify } from "../notify/index.js";
import { stopEscalation } from "../../agent/escalation.js";
import { authUser, newToken } from "./common.js";
import { sessionStatusJson } from "./guardian.js";

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const battery = z.number().int().min(0).max(100);
const state = z.string().trim().max(60);

const startBody = z.object({
  kind: z.enum(["walk", "suspicion"]).default("walk"),
  destination: z.string().trim().max(120).optional(),
  timerMinutes: z.number().min(1).max(240).optional(),
  battery: battery.optional(),
  state: state.optional(),
  buddyMatchId: z.string().max(64).optional(),
  inSafeZone: z.boolean().default(false),
});
const heartbeatBody = z.object({
  lat: lat.optional(),
  lng: lng.optional(),
  accuracy: z.number().min(0).optional(),
  battery: battery.optional(),
  state: state.optional(),
  inSafeZone: z.boolean(),
});
// The phone checks the PIN locally and only tells the server which kind it was.
const endBody = z.object({ reason: z.enum(["cancel", "duress"]) });
// Emergency calls carry the current location even inside a safe zone (the user asked for help).
const emergencyBody = z.object({
  sessionId: z.string().max(64).optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  accuracy: z.number().min(0).optional(),
  battery: battery.optional(),
  state: state.optional(),
});
const keywordBody = emergencyBody.extend({
  keyword: z.string().trim().min(1).max(40),
  snippets: z.array(z.string().trim().max(500)).max(20).default([]),
});

type IdReq = FastifyRequest<{ Params: { id: string } }>;

function ownSession(req: IdReq, reply: FastifyReply, user: UserRow) {
  const s = getOne<SessionRow>("SELECT * FROM sessions WHERE id = ? AND user_id = ?", req.params.id, user.id);
  if (!s) reply.code(404).send({ error: "session not found" });
  return s;
}

export const sessionById = (id: string) => getOne<SessionRow>("SELECT * FROM sessions WHERE id = ?", id)!;

function createSession(userId: string, kind: SessionKind, fields: { destination?: string; timerEndsAt?: number | null; battery?: number; state?: string; inSafeZone?: boolean; buddyMatchId?: string }) {
  const now = Date.now();
  const id = randomUUID();
  run(
    `INSERT INTO sessions (id, user_id, kind, status, destination, guardian_token, timer_ends_at,
       in_safe_zone, battery, last_heartbeat_at, created_at, state, buddy_match_id)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, userId, kind, fields.destination ?? null, newToken(12), fields.timerEndsAt ?? null,
    fields.inSafeZone ? 1 : 0, fields.battery ?? null, now, now, fields.state ?? null, fields.buddyMatchId ?? null,
  );
  return sessionById(id);
}

function saveLocation(sessionId: string, b: { lat?: number; lng?: number; accuracy?: number }) {
  if (b.lat == null || b.lng == null) return;
  run("INSERT INTO locations (session_id, lat, lng, accuracy, at) VALUES (?, ?, ?, ?, ?)",
    sessionId, b.lat, b.lng, b.accuracy ?? null, Date.now());
}

// SOS / keyword: reuse the running session if there is one, otherwise open a panic session.
function emergencySession(user: UserRow, body: z.infer<typeof emergencyBody>) {
  const existing = body.sessionId
    ? getOne<SessionRow>("SELECT * FROM sessions WHERE id = ? AND user_id = ? AND status != 'ended'", body.sessionId, user.id)
    : undefined;
  const s = existing ?? createSession(user.id, "panic", { battery: body.battery, state: body.state });
  const now = Date.now();
  // Panic always works, even inside a safe zone (safety rule 6): tracking switches back on.
  run(
    "UPDATE sessions SET panic_at = COALESCE(panic_at, ?), in_safe_zone = 0, last_heartbeat_at = ?, battery = COALESCE(?, battery), state = COALESCE(?, state) WHERE id = ?",
    now, now, body.battery ?? null, body.state ?? null, s.id,
  );
  saveLocation(s.id, body);
  return sessionById(s.id);
}

export async function sessionRoutes(app: FastifyInstance) {
  app.post("/sessions", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = startBody.parse(req.body ?? {});
    const now = Date.now();
    // One walk at a time: a new walk ends an old quiet walk. A session that has alerted (or is in
    // panic mode) is NOT ended here — only her real PIN can end it (safety rule 2).
    run(
      `UPDATE sessions SET status = 'ended', ended_at = ? WHERE user_id = ? AND status = 'active'
         AND kind IN ('walk', 'suspicion') AND panic_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.session_id = sessions.id)`,
      now, user.id,
    );
    const s = createSession(user.id, body.kind, {
      destination: body.destination,
      timerEndsAt: body.timerMinutes ? now + Math.round(body.timerMinutes * 60_000) : null,
      battery: body.battery,
      state: body.state,
      inSafeZone: body.inSafeZone,
      buddyMatchId: body.buddyMatchId,
    });
    return { sessionId: s.id, timerEndsAt: s.timer_ends_at, guardianUrl: guardianUrl(s) };
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/heartbeat", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = ownSession(req, reply, user);
    if (!s) return;
    const body = heartbeatBody.parse(req.body);
    if (s.status === "ended") return { ok: true, active: false };
    const now = Date.now();
    // Panic mode ignores the safe-zone flag: the user asked for help.
    const inZone = body.inSafeZone && s.panic_at == null;
    // Safety rule 6: inside a safe zone no location is stored, even if one was sent.
    if (!inZone) saveLocation(s.id, body);
    run(
      "UPDATE sessions SET last_heartbeat_at = ?, in_safe_zone = ?, battery = COALESCE(?, battery), state = COALESCE(?, state), lost_contact = 0 WHERE id = ?",
      now, inZone ? 1 : 0, body.battery ?? null, body.state ?? null, s.id,
    );
    const fresh = sessionById(s.id);
    if (s.lost_contact) await sendContactRestored(fresh);
    // Battery <= 10%: share the last location once (not from inside a safe zone).
    if (!inZone && fresh.battery != null && fresh.battery <= 10 && !fresh.battery_alerted) {
      run("UPDATE sessions SET battery_alerted = 1 WHERE id = ?", s.id);
      await fireAlert(fresh, "battery_low");
    }
    // Identical answer for normal and duress sessions, so the phone never reveals duress.
    return { ok: true, active: true };
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/end", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = ownSession(req, reply, user);
    if (!s) return;
    const { reason } = endBody.parse(req.body);
    if (reason === "duress" && s.status !== "ended") {
      // Safety rule 7: same reply as a cancel, but alerts instantly and the session stays watched.
      run("UPDATE sessions SET status = 'duress' WHERE id = ?", s.id);
      await fireAlert(sessionById(s.id), "duress");
    } else if (reason === "cancel" && s.status === "active") {
      const now = Date.now();
      run("UPDATE sessions SET status = 'ended', ended_at = ? WHERE id = ?", now, s.id);
      stopEscalation(s.id, "she ended the session with her PIN");
      await tellContactsIfAlerted(user, s.id, now);
    }
    // A normal cancel can't end a duress session: once raised under duress, the alert stands.
    return { ok: true };
  });

  // Suspicion mode: the phone heard a safety word. Instant template alert; the agent follows up.
  app.post<{ Params: { id: string } }>("/sessions/:id/keyword", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = keywordBody.parse(req.body);
    const s = emergencySession(user, { ...body, sessionId: req.params.id });
    run("UPDATE sessions SET keyword = ? WHERE id = ?", body.keyword, s.id);
    const now = Date.now();
    for (const text of body.snippets.filter(Boolean)) {
      run("INSERT INTO transcript_snippets (session_id, text, at) VALUES (?, ?, ?)", s.id, text, now);
    }
    await fireAlert(sessionById(s.id), "keyword");
    return { ok: true, sessionId: s.id, guardianUrl: guardianUrl(s) };
  });

  // SOS button. Works with or without a running walk, and inside safe zones.
  app.post("/panic", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = emergencyBody.parse(req.body ?? {});
    const s = emergencySession(user, body);
    const alreadyAlerted = getOne<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE session_id = ? AND type IN ('panic', 'keyword')", s.id)!.n > 0;
    if (!alreadyAlerted) await fireAlert(s, "panic");
    return { ok: true, sessionId: s.id, guardianUrl: guardianUrl(s) };
  });

  // Alert timeline for the phone's "Stay with me" screen.
  app.get<{ Params: { id: string } }>("/sessions/:id/status", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = ownSession(req, reply, user);
    if (!s) return;
    return sessionStatusJson(s);
  });
}

// Only if an alert already went out, so contacts aren't left worrying. Real PIN only.
async function tellContactsIfAlerted(user: UserRow, sessionId: string, now: number) {
  const alerted = getOne<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE session_id = ?", sessionId)!.n > 0;
  if (!alerted) return;
  const contacts = getAll<ContactRow>("SELECT * FROM contacts WHERE user_id = ? AND tier = 'inner' ORDER BY position", user.id);
  const text = `SafeWalk update: ${user.name} ended her session with her PIN at ${formatTime(now)}.`;
  await Promise.all(contacts.map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, text)));
}
