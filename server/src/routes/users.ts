import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { getOne, run, type ContactRow, type UserRow } from "../db.js";
import { authUser, contactJson, meJson, newLinkCode, newToken } from "./common.js";

// 1–15 min, set from the app's Settings slider.
const escalationWait = z.number().int().min(60).max(900);

const createUserBody = z.object({
  name: z.string().trim().min(1).max(60),
  escalationWaitSeconds: escalationWait.optional(),
});
const updateUserBody = createUserBody.partial();
const contactBody = z.object({
  name: z.string().trim().min(1).max(60),
  tier: z.enum(["inner", "wider"]).default("inner"),
});
// Medical card, shown on the guardian page. Empty string clears a field.
const medicalBody = z.object({
  bloodGroup: z.string().trim().max(10).optional(),
  allergies: z.string().trim().max(300).optional(),
  conditions: z.string().trim().max(300).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.post("/users", async (req) => {
    const body = createUserBody.parse(req.body);
    const user: UserRow = {
      id: randomUUID(),
      token: newToken(24),
      name: body.name,
      escalation_wait_seconds: body.escalationWaitSeconds ?? config.escalationWaitSeconds,
      created_at: Date.now(),
      blood_group: null,
      allergies: null,
      conditions: null,
      email: null,
      email_verified: 0,
      photo_file: null,
      photo_token: null,
    };
    run(
      "INSERT INTO users (id, token, name, escalation_wait_seconds, created_at) VALUES (?, ?, ?, ?, ?)",
      user.id, user.token, user.name, user.escalation_wait_seconds, user.created_at,
    );
    return { token: user.token, ...meJson(user) };
  });

  app.get("/me", async (req, reply) => {
    const user = authUser(req, reply);
    return user && meJson(user);
  });

  app.patch("/me", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = updateUserBody.parse(req.body);
    if (body.name) run("UPDATE users SET name = ? WHERE id = ?", body.name, user.id);
    if (body.escalationWaitSeconds) {
      run("UPDATE users SET escalation_wait_seconds = ? WHERE id = ?", body.escalationWaitSeconds, user.id);
    }
    return meJson(getOne<UserRow>("SELECT * FROM users WHERE id = ?", user.id)!);
  });

  app.put("/me/medical", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = medicalBody.parse(req.body ?? {});
    const val = (v: string | undefined, old: string | null) => (v === undefined ? old : v || null);
    run(
      "UPDATE users SET blood_group = ?, allergies = ?, conditions = ? WHERE id = ?",
      val(body.bloodGroup, user.blood_group), val(body.allergies, user.allergies), val(body.conditions, user.conditions), user.id,
    );
    return meJson(getOne<UserRow>("SELECT * FROM users WHERE id = ?", user.id)!);
  });

  // Each contact gets a t.me link; pressing Start in Telegram saves their chat id.
  app.post("/contacts", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const body = contactBody.parse(req.body);
    const position = getOne<{ n: number }>(
      "SELECT COALESCE(MAX(position), 0) + 1 AS n FROM contacts WHERE user_id = ?", user.id,
    )!.n;
    const c: ContactRow = {
      id: randomUUID(), user_id: user.id, name: body.name, tier: body.tier, position,
      link_code: newLinkCode(), telegram_chat_id: null, created_at: Date.now(),
    };
    run(
      "INSERT INTO contacts (id, user_id, name, tier, position, link_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      c.id, c.user_id, c.name, c.tier, c.position, c.link_code, c.created_at,
    );
    return contactJson(c);
  });

  app.delete<{ Params: { id: string } }>("/contacts/:id", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    run("DELETE FROM contacts WHERE id = ? AND user_id = ?", req.params.id, user.id);
    return { ok: true };
  });
}
