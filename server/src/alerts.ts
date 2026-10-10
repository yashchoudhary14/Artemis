import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { getAll, getOne, run, type ContactRow, type LocationRow, type SessionRow, type UserRow } from "./db.js";
import { log } from "./log.js";
import { notify } from "./notify/index.js";

// Safety rule 1: every first alert is a fixed template sent by plain code. No AI here.
export type AlertType = "timer" | "duress" | "lost_contact";

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: config.timeZone,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatTime(ms: number): string {
  return timeFmt.format(new Date(ms)).toLowerCase();
}

export function guardianUrl(session: SessionRow): string {
  return `${config.publicBaseUrl}/g/${session.guardian_token}`;
}

function mapsLink(loc: LocationRow): string {
  return `https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`;
}

function lastLocation(sessionId: string): LocationRow | undefined {
  return getOne<LocationRow>("SELECT lat, lng, accuracy, at FROM locations WHERE session_id = ? ORDER BY at DESC LIMIT 1", sessionId);
}

// Calm, factual wording (safety rule 8).
function whereAndBattery(session: SessionRow, loc: LocationRow | undefined): string {
  const where = loc ? `Last location: ${mapsLink(loc)} (at ${formatTime(loc.at)}).` : "Location not available yet.";
  const battery = session.battery != null ? ` Battery ${session.battery}%.` : "";
  return `${where}${battery}`;
}

export function buildInnerMessage(type: AlertType, name: string, session: SessionRow, now: number): string {
  const loc = lastLocation(session.id);
  const dest = session.destination ? ` to ${session.destination}` : "";
  const headline = {
    timer: `${name}'s walk timer${dest} ran out at ${formatTime(now)} and she has not checked in.`,
    duress: `${name} may need help. Her walk${dest} was stopped with her emergency PIN at ${formatTime(now)}.`,
    lost_contact: `Lost contact with ${name} at ${formatTime(now)}. Her phone stopped sending updates during a walk${dest}.`,
  }[type];
  return `SafeWalk alert: ${headline} ${whereAndBattery(session, loc)} Live link: ${guardianUrl(session)}`;
}

// Wider circle gets location only (no live link).
function buildWiderMessage(name: string, session: SessionRow, now: number): string {
  const loc = lastLocation(session.id);
  const where = loc ? `last known location ${mapsLink(loc)} (at ${formatTime(loc.at)})` : "no location available yet";
  return `SafeWalk alert: ${name} may need help (${formatTime(now)}). Her ${where}.`;
}

async function sendToContacts(session: SessionRow, inner: string, wider: string | null) {
  const contacts = getAll<ContactRow>("SELECT * FROM contacts WHERE user_id = ? ORDER BY position", session.user_id);
  if (contacts.length === 0) log.warn(`no contacts for user ${session.user_id}; alert only logged`, { inner });
  await Promise.all(
    contacts
      .filter((c) => c.tier === "inner" || wider)
      .map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, c.tier === "inner" ? inner : wider!)),
  );
}

export async function fireAlert(session: SessionRow, type: AlertType): Promise<void> {
  const user = getOne<UserRow>("SELECT * FROM users WHERE id = ?", session.user_id);
  const name = user?.name ?? "SafeWalk user";
  const now = Date.now();
  const inner = buildInnerMessage(type, name, session, now);
  run("INSERT INTO alerts (id, session_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)", randomUUID(), session.id, type, inner, now);
  log.info(`ALERT ${type} for session ${session.id}`);
  await sendToContacts(session, inner, buildWiderMessage(name, session, now));
}

// Sent to the inner circle when heartbeats come back after a lost-contact alert.
export async function sendContactRestored(session: SessionRow): Promise<void> {
  const user = getOne<UserRow>("SELECT * FROM users WHERE id = ?", session.user_id);
  const name = user?.name ?? "SafeWalk user";
  const text = `SafeWalk update: ${name}'s phone is sending updates again (${formatTime(Date.now())}). ${whereAndBattery(session, lastLocation(session.id))} Live link: ${guardianUrl(session)}`;
  await sendToContacts(session, text, null);
}
