import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { incidentReport, walkBriefing } from "../../agent/companion.js";
import { getOne, type SessionRow } from "../db.js";
import { authUser } from "./common.js";

const briefingBody = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  destination: z.string().trim().max(120).optional(),
  timerMinutes: z.number().int().min(1).max(240).optional(),
});

// Artemis companion features (Cline agent, read-only, with plain-code fallbacks).
export async function companionRoutes(app: FastifyInstance) {
  app.post("/briefing", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = briefingBody.parse(req.body ?? {});
    return walkBriefing({ ...body, name: user.name.split(" ")[0] });
  });

  app.get<{ Params: { id: string } }>("/sessions/:id/report", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = getOne<SessionRow>("SELECT * FROM sessions WHERE id = ?", req.params.id);
    if (!s || s.user_id !== user.id) return reply.code(404).send({ error: "session not found" });
    return incidentReport(s);
  });
}
