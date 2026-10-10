import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fireAlert, guardianUrl } from "../alerts.js";
import { getOne, run, type SessionRow } from "../db.js";
import { ambulanceNumber, helplinesFor } from "../helplines.js";
import { log } from "../log.js";
import { findNearby } from "../places.js";
import { authUser, newToken } from "./common.js";

const nearbyQuery = z.object({
  type: z.enum(["hospital", "police"]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
const medicalBody = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
  battery: z.number().int().min(0).max(100).optional(),
  state: z.string().trim().max(60).optional(),
});

export async function helpRoutes(app: FastifyInstance) {
  // Public: verified numbers only (entries without a source URL are dropped in helplines.ts).
  app.get<{ Querystring: { state?: string } }>("/helplines", async (req) => {
    const state = req.query.state?.trim() || null;
    return { state, ambulanceNumber: ambulanceNumber(state), helplines: helplinesFor(state) };
  });

  // Google Places only. Auth required so strangers can't spend the API quota.
  app.get("/nearby", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const q = nearbyQuery.parse(req.query);
    try {
      return { source: "Google Maps", places: await findNearby(q.type, q.lat, q.lng, 8) };
    } catch (err) {
      log.warn(`nearby failed: ${(err as Error).message}`);
      return reply.code(502).send({ error: "nearby search unavailable", places: [] });
    }
  });

  // Medical fast-dial: the phone opens the dialler itself; here we notify the inner circle
  // at the same moment with the location (template, no AI). Works inside a safe zone.
  app.post("/medical", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = medicalBody.parse(req.body ?? {});
    const now = Date.now();
    const id = randomUUID();
    run(
      `INSERT INTO sessions (id, user_id, kind, status, guardian_token, battery, last_heartbeat_at, created_at, state)
       VALUES (?, ?, 'medical', 'active', ?, ?, ?, ?, ?)`,
      id, user.id, newToken(12), body.battery ?? null, now, now, body.state ?? null,
    );
    if (body.lat != null && body.lng != null) {
      run("INSERT INTO locations (session_id, lat, lng, accuracy, at) VALUES (?, ?, ?, ?, ?)", id, body.lat, body.lng, body.accuracy ?? null, now);
    }
    const s = getOne<SessionRow>("SELECT * FROM sessions WHERE id = ?", id)!;
    await fireAlert(s, "medical");
    return { ok: true, sessionId: id, guardianUrl: guardianUrl(s), ambulanceNumber: ambulanceNumber(body.state) };
  });
}
