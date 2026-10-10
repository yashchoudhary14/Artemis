import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getAll, getOne, run, type ContactRow, type SessionRow, type UserRow } from "../db.js";
import { fireAlert, formatTime, guardianUrl, sendContactRestored } from "../alerts.js";
import { notify } from "../notify/index.js";
import { authUser, newToken } from "./common.js";

const startBody = z.object({
  destination: z.string().trim().max(120).optional(),
  timerMinutes: z.number().min(1).max(240).optional(),
  battery: z.number().int().min(0).max(100).optional(),
  inSafeZone: z.boolean().default(false),
});
const heartbeatBody = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
  battery: z.number().int().min(0).max(100).optional(),
  inSafeZone: z.boolean(),
});
// The phone checks the PIN locally and only tells the server which kind it was.
const endBody = z.object({ reason: z.enum(["cancel", "duress"]) });

type IdReq = FastifyRequest<{ Params: { id: string } }>;

function ownSession(req: IdReq, reply: FastifyReply, user: UserRow) {
  const s = getOne<SessionRow>("SELECT * FROM sessions WHERE id = ? AND user_id = ?", req.params.id, user.id);
  if (!s) reply.code(404).send({ error: "session not found" });
  return s;
}

const sessionById = (id: string) => getOne<SessionRow>("SELECT * FROM sessions WHERE id = ?", id)!;

export async function sessionRoutes(app: FastifyInstance) {
  app.post("/sessions", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = startBody.parse(req.body ?? {});
    const now = Date.now();
    // One walk at a time: a new walk ends any old normal walk. Duress sessions stay watched.
    run("UPDATE sessions SET status = 'ended', ended_at = ? WHERE user_id = ? AND status = 'active'", now, user.id);
    const id = randomUUID();
    const timerEndsAt = body.timerMinutes ? now + Math.round(body.timerMinutes * 60_000) : null;
    run(
      `INSERT INTO sessions (id, user_id, kind, status, destination, guardian_token, timer_ends_at,
         in_safe_zone, battery, last_heartbeat_at, created_at)
       VALUES (?, ?, 'walk', 'active', ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, body.destination ?? null, newToken(12), timerEndsAt,
      body.inSafeZone ? 1 : 0, body.battery ?? null, now, now,
    );
    return { sessionId: id, timerEndsAt, guardianUrl: guardianUrl(sessionById(id)) };
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/heartbeat", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = ownSession(req, reply, user);
    if (!s) return;
    const body = heartbeatBody.parse(req.body);
    if (s.status === "ended") return { ok: true, active: false };
    const now = Date.now();
    // Safety rule 6: inside a safe zone no location is stored, even if one was sent.
    if (!body.inSafeZone && body.lat != null && body.lng != null) {
      run("INSERT INTO locations (session_id, lat, lng, accuracy, at) VALUES (?, ?, ?, ?, ?)",
        s.id, body.lat, body.lng, body.accuracy ?? null, now);
    }
    run(
      "UPDATE sessions SET last_heartbeat_at = ?, in_safe_zone = ?, battery = COALESCE(?, battery), lost_contact = 0 WHERE id = ?",
      now, body.inSafeZone ? 1 : 0, body.battery ?? null, s.id,
    );
    if (s.lost_contact) await sendContactRestored(sessionById(s.id));
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
      await fireAlert(s, "duress");
    } else if (reason === "cancel" && s.status === "active") {
      const now = Date.now();
      run("UPDATE sessions SET status = 'ended', ended_at = ? WHERE id = ?", now, s.id);
      await tellContactsIfAlerted(user, s.id, now);
    }
    // A normal cancel can't end a duress session: once raised under duress, the alert stands.
    return { ok: true };
  });
}

// Only if an alert already went out, so contacts aren't left worrying. Real PIN only.
async function tellContactsIfAlerted(user: UserRow, sessionId: string, now: number) {
  const alerted = getOne<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE session_id = ?", sessionId)!.n > 0;
  if (!alerted) return;
  const contacts = getAll<ContactRow>("SELECT * FROM contacts WHERE user_id = ? AND tier = 'inner' ORDER BY position", user.id);
  const text = `SafeWalk update: ${user.name} ended her walk with her PIN at ${formatTime(now)}.`;
  await Promise.all(contacts.map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, text)));
}
