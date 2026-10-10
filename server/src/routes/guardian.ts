import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { acknowledge } from "../../agent/escalation.js";
import { AI_LABEL } from "../../agent/tools.js";
import { userName } from "../alerts.js";
import { getAll, getOne, run, type AudioChunkRow, type EscalationRow, type SessionRow, type UserRow } from "../db.js";
import { audioDir } from "./audio.js";
import { medicalJson, photoUrl } from "./common.js";

const ackBody = z.object({ name: z.string().trim().min(1).max(60) });

const byToken = (token: string) => getOne<SessionRow>("SELECT * FROM sessions WHERE guardian_token = ?", token);

function alertsOf(sessionId: string) {
  return getAll<{ type: string; message: string; created_at: number }>(
    "SELECT type, message, created_at FROM alerts WHERE session_id = ? ORDER BY created_at",
    sessionId,
  ).map((a) => ({ type: a.type, message: a.message, at: a.created_at }));
}

function acksOf(sessionId: string) {
  return getAll<{ name: string; at: number }>("SELECT name, at FROM acks WHERE session_id = ? ORDER BY at", sessionId);
}

function escalationOf(sessionId: string) {
  const e = getOne<EscalationRow>("SELECT * FROM escalations WHERE session_id = ?", sessionId);
  return e ? { step: e.step, level: e.level, done: Boolean(e.done), doneReason: e.done_reason, nextAt: e.done ? null : e.next_at } : null;
}

// Agent messages, with one entry per text even when it went to several contacts.
function agentOf(sessionId: string) {
  const rows = getAll<{ kind: string; text: string; recipient: string | null; at: number }>(
    "SELECT kind, text, recipient, at FROM agent_events WHERE session_id = ? ORDER BY id",
    sessionId,
  );
  const out: { kind: string; text: string; recipients: string[]; at: number }[] = [];
  const byText = new Map<string, (typeof out)[number]>();
  for (const r of rows) {
    const key = `${r.kind}\n${r.text}`;
    const prev = r.recipient ? byText.get(key) : undefined;
    if (prev) {
      prev.recipients.push(...r.recipient!.split(", "));
      continue;
    }
    const item = { kind: r.kind, text: r.text, recipients: r.recipient ? r.recipient.split(", ") : [], at: r.at };
    out.push(item);
    if (r.recipient) byText.set(key, item);
  }
  return out;
}

function buddyOf(session: SessionRow) {
  if (!session.buddy_match_id) return null;
  const m = getOne<{ user_a: string; user_b: string }>("SELECT user_a, user_b FROM buddy_matches WHERE id = ?", session.buddy_match_id);
  if (!m) return null;
  const buddyId = m.user_a === session.user_id ? m.user_b : m.user_a;
  const b = getOne<UserRow>("SELECT * FROM users WHERE id = ?", buddyId);
  return b ? { name: b.name, photoUrl: photoUrl(b) } : null;
}

// Everything a guardian sees. Polled every 3 s by server/public/guardian.js.
export function guardianJson(session: SessionRow) {
  const user = getOne<UserRow>("SELECT * FROM users WHERE id = ?", session.user_id)!;
  const trail = getAll<{ lat: number; lng: number; accuracy: number | null; at: number }>(
    "SELECT lat, lng, accuracy, at FROM (SELECT * FROM locations WHERE session_id = ? ORDER BY at DESC LIMIT 300) ORDER BY at",
    session.id,
  );
  const chunks = getAll<AudioChunkRow>("SELECT * FROM audio_chunks WHERE session_id = ? ORDER BY seq", session.id);
  return {
    name: userName(session.user_id),
    kind: session.kind,
    status: session.status,
    destination: session.destination,
    startedAt: session.created_at,
    endedAt: session.ended_at,
    timerEndsAt: session.timer_ends_at,
    battery: session.battery,
    lastUpdateAt: session.last_heartbeat_at,
    lostContact: Boolean(session.lost_contact),
    inSafeZone: Boolean(session.in_safe_zone),
    keyword: session.keyword,
    panicAt: session.panic_at,
    trail,
    alerts: alertsOf(session.id),
    acks: acksOf(session.id),
    escalation: escalationOf(session.id),
    agent: agentOf(session.id),
    aiLabel: AI_LABEL,
    audio: chunks.map((c) => ({
      seq: c.seq,
      at: c.started_at ?? c.received_at,
      url: `/api/guardian/${session.guardian_token}/audio/${c.seq}`,
      transcript: c.transcript,
    })),
    medical: medicalJson(user),
    buddy: buddyOf(session),
    serverTime: Date.now(),
  };
}

// The phone's own view. A duress session must look exactly like a cancelled one (rule 7).
export function sessionStatusJson(session: SessionRow) {
  if (session.status === "duress") {
    return { status: "ended", kind: session.kind, alerts: [], acks: [], escalation: null, agent: [], audioChunks: 0 };
  }
  const audioChunks = getOne<{ n: number }>("SELECT COUNT(*) AS n FROM audio_chunks WHERE session_id = ?", session.id)!.n;
  return {
    status: session.status,
    kind: session.kind,
    alerts: alertsOf(session.id).map((a) => ({ type: a.type, at: a.at })),
    acks: acksOf(session.id),
    escalation: escalationOf(session.id),
    agent: agentOf(session.id).filter((a) => ["message", "summary", "fallback", "level", "done"].includes(a.kind)),
    audioChunks,
  };
}

export async function guardianRoutes(app: FastifyInstance) {
  // The page itself; it reads the token from its own URL.
  app.get<{ Params: { token: string } }>("/g/:token", async (_req, reply) => reply.sendFile("guardian.html"));

  app.get<{ Params: { token: string } }>("/api/guardian/:token", async (req, reply) => {
    const s = byToken(req.params.token);
    if (!s) return reply.code(404).send({ error: "link not valid" });
    return guardianJson(s);
  });

  app.post<{ Params: { token: string } }>("/api/guardian/:token/ack", async (req, reply) => {
    const s = byToken(req.params.token);
    if (!s) return reply.code(404).send({ error: "link not valid" });
    const { name } = ackBody.parse(req.body);
    const already = getOne<{ n: number }>("SELECT COUNT(*) AS n FROM acks WHERE session_id = ? AND name = ?", s.id, name)!.n > 0;
    if (!already) {
      run("INSERT INTO acks (session_id, contact_id, name, at) VALUES (?, NULL, ?, ?)", s.id, name, Date.now());
      await acknowledge(s, name);
    }
    return { ok: true };
  });

  app.get<{ Params: { token: string; seq: string } }>("/api/guardian/:token/audio/:seq", async (req, reply) => {
    const s = byToken(req.params.token);
    if (!s) return reply.code(404).send({ error: "link not valid" });
    const c = getOne<AudioChunkRow>("SELECT * FROM audio_chunks WHERE session_id = ? AND seq = ?", s.id, Number(req.params.seq));
    const file = c ? path.join(audioDir, c.file) : "";
    if (!c || !existsSync(file)) return reply.code(404).send({ error: "audio not found" });
    return reply.type(c.mime).header("cache-control", "private, max-age=3600").send(createReadStream(file));
  });
}
