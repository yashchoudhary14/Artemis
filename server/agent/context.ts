import { formatTime, guardianUrl, innerContacts, mapsLink, userName } from "../src/alerts.js";
import { getAll, getOne, type AudioChunkRow, type EscalationRow, type LocationRow, type SessionRow } from "../src/db.js";

// Plain-code readers shared by the agent tools and the fallback templates.

export const sessionById = (id: string) => getOne<SessionRow>("SELECT * FROM sessions WHERE id = ?", id);

export function locationTrail(sessionId: string, limit = 10): LocationRow[] {
  return getAll<LocationRow>(
    "SELECT lat, lng, accuracy, at FROM locations WHERE session_id = ? ORDER BY at DESC LIMIT ?",
    sessionId,
    limit,
  ).reverse();
}

export function acksFor(sessionId: string) {
  return getAll<{ name: string; contact_id: string | null; at: number }>(
    "SELECT name, contact_id, at FROM acks WHERE session_id = ? ORDER BY at",
    sessionId,
  );
}

export function snippetsFor(sessionId: string, limit = 10) {
  return getAll<{ text: string; at: number }>(
    "SELECT text, at FROM transcript_snippets WHERE session_id = ? ORDER BY at DESC LIMIT ?",
    sessionId,
    limit,
  ).reverse();
}

export function transcriptsFor(sessionId: string) {
  return getAll<AudioChunkRow>(
    "SELECT * FROM audio_chunks WHERE session_id = ? AND transcript IS NOT NULL ORDER BY seq",
    sessionId,
  ).map((c) => ({ seq: c.seq, at: formatTime(c.started_at ?? c.received_at), text: c.transcript }));
}

export function sessionContext(session: SessionRow) {
  const now = Date.now();
  const trail = locationTrail(session.id);
  const last = trail.at(-1);
  const alerts = getAll<{ type: string; created_at: number }>(
    "SELECT type, created_at FROM alerts WHERE session_id = ? ORDER BY created_at",
    session.id,
  );
  const esc = getOne<EscalationRow>("SELECT * FROM escalations WHERE session_id = ?", session.id);
  return {
    personName: userName(session.user_id),
    sessionKind: session.kind,
    status: session.status === "duress" ? "stopped with emergency (duress) PIN — treat as serious" : session.status,
    destination: session.destination,
    state: session.state,
    keywordHeard: session.keyword,
    alerts: alerts.map((a) => ({ type: a.type, at: formatTime(a.created_at) })),
    batteryPercent: session.battery,
    secondsSinceLastPhoneUpdate: Math.round((now - session.last_heartbeat_at) / 1000),
    phoneLostContact: Boolean(session.lost_contact),
    lastLocation: last ? { mapsLink: mapsLink(last), at: formatTime(last.at), accuracyM: last.accuracy } : null,
    locationTrail: trail.map((l) => ({ lat: Number(l.lat.toFixed(5)), lng: Number(l.lng.toFixed(5)), at: formatTime(l.at) })),
    recentWordsHeardByPhone: snippetsFor(session.id).map((s) => s.text),
    innerCircle: innerContacts(session.user_id).map((c) => ({ contactId: c.id, name: c.name, order: c.position })),
    acknowledgements: acksFor(session.id).map((a) => ({ name: a.name, at: formatTime(a.at) })),
    escalation: esc ? { nextContactIndex: esc.step, level: esc.level } : null,
    liveLink: guardianUrl(session),
    now: formatTime(now),
  };
}
