import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getAll, getOne, type ContactRow, type UserRow } from "../db.js";
import { telegramLinkUrl } from "../telegramLink.js";

export const newToken = (bytes: number) => randomBytes(bytes).toString("base64url");

// 6-char code without look-alike characters (0/O, 1/I).
export function newLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

// The phone sends "Authorization: Bearer <token>" (token from POST /users, kept in SecureStore).
export function authUser(req: FastifyRequest, reply: FastifyReply): UserRow | undefined {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const user = bearer ? getOne<UserRow>("SELECT * FROM users WHERE token = ?", bearer) : undefined;
  if (!user) reply.code(401).send({ error: "unauthorized" });
  return user;
}

export function contactJson(c: ContactRow) {
  return {
    id: c.id,
    name: c.name,
    tier: c.tier,
    position: c.position,
    linkCode: c.link_code,
    linkUrl: telegramLinkUrl(c.link_code),
    linked: c.telegram_chat_id != null,
  };
}

export function meJson(user: UserRow) {
  const contacts = getAll<ContactRow>("SELECT * FROM contacts WHERE user_id = ? ORDER BY position", user.id);
  return {
    id: user.id,
    name: user.name,
    escalationWaitSeconds: user.escalation_wait_seconds,
    contacts: contacts.map(contactJson),
  };
}
