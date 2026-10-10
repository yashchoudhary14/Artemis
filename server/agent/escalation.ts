import { config } from "../src/config.js";
import {
  ESCALATING_ALERTS,
  formatTime,
  guardianUrl,
  innerContacts,
  lastLocation,
  onAlert,
  userName,
  type AlertType,
} from "../src/alerts.js";
import { getOne, run, type EscalationRow, type SessionRow, type UserRow } from "../src/db.js";
import { log } from "../src/log.js";
import { notify } from "../src/notify/index.js";
import { findNearby } from "../src/places.js";
import { acksFor, sessionById } from "./context.js";
import { recordAgentEvent } from "./events.js";
import { runAgent } from "./runner.js";

// The escalation ladder. Timing and order are plain code; the agent only writes the
// messages and may raise the level. Safety rule 2: nothing here can lower or cancel an
// alert. It stops only when a person presses "I'm on it" or the user ends the walk with
// her REAL PIN (a duress PIN keeps the session — and this ladder — running).

const URGENT_LEVEL = 3;

function waitMs(session: SessionRow): number {
  const user = getOne<UserRow>("SELECT * FROM users WHERE id = ?", session.user_id);
  return (user?.escalation_wait_seconds ?? config.escalationWaitSeconds) * 1000;
}

const escalationOf = (sessionId: string) => getOne<EscalationRow>("SELECT * FROM escalations WHERE session_id = ?", sessionId);

function finish(sessionId: string, reason: string) {
  run("UPDATE escalations SET done = 1, running = 0, done_reason = ? WHERE session_id = ? AND done = 0", reason, sessionId);
  recordAgentEvent(sessionId, "done", `Escalation stopped: ${reason}`);
}

// Only for a REAL-PIN end (never called by the agent).
export function stopEscalation(sessionId: string, reason: string) {
  const esc = escalationOf(sessionId);
  if (esc && !esc.done) finish(sessionId, reason);
}

async function sendToInner(session: SessionRow, text: string, kind = "escalation") {
  await Promise.all(
    innerContacts(session.user_id).map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, text, { sessionId: session.id, kind })),
  );
}

// Called after every first (template) alert.
export function startEscalation(session: SessionRow, type: AlertType) {
  if (!ESCALATING_ALERTS.has(type)) return;
  const now = Date.now();
  const urgent = type === "keyword" || type === "panic" || type === "duress";
  const existing = escalationOf(session.id);
  if (existing) {
    // A later, more serious trigger raises the level (never lowers it).
    if (urgent) run("UPDATE escalations SET level = MAX(level, 2) WHERE session_id = ?", session.id);
  } else {
    // Keyword/SOS: the follow-up goes to everyone first, so contact 1's personal ask waits one round.
    const firstStepAt = urgent && type !== "duress" ? now + waitMs(session) : now + 3000;
    run(
      "INSERT INTO escalations (session_id, trigger, step, level, next_at, started_at) VALUES (?, ?, 0, ?, ?, ?)",
      session.id,
      type,
      urgent ? 2 : 1,
      firstStepAt,
      now,
    );
    recordAgentEvent(session.id, "start", `Escalation started after a ${type.replace("_", " ")} alert.`);
  }
  if (type === "keyword" || type === "panic") void runFollowUp(session.id);
}

onAlert(startEscalation);

// Watchdog tick: run every due step without blocking the timer / dead man's switch checks.
export function tickEscalations(now = Date.now()) {
  const due = getOne<{ ids: string | null }>(
    "SELECT group_concat(session_id) AS ids FROM escalations WHERE done = 0 AND running = 0 AND next_at <= ?",
    now,
  )?.ids;
  for (const id of due ? due.split(",") : []) {
    run("UPDATE escalations SET running = 1 WHERE session_id = ?", id);
    void runStep(id).catch((err) => {
      log.error(`escalation step failed: ${(err as Error).message}`, { sessionId: id });
      run("UPDATE escalations SET running = 0, next_at = ? WHERE session_id = ?", Date.now() + 30_000, id);
    });
  }
}

// A person pressed "I'm on it" on the guardian page: stop the ladder (a human is responding)
// and tell the rest of the inner circle. The alert itself stays visible on the page.
export async function acknowledge(session: SessionRow, ackName: string) {
  const esc = escalationOf(session.id);
  if (esc && !esc.done) finish(session.id, `${ackName} is on it`);
  const name = userName(session.user_id);
  await sendToInner(
    session,
    `SafeWalk update: ${ackName} pressed "I'm on it" for ${name} at ${formatTime(Date.now())}. Live link: ${guardianUrl(session)}`,
    "update",
  );
}

// After a restart nothing is mid-step.
export function resetRunningEscalations() {
  run("UPDATE escalations SET running = 0 WHERE running = 1");
}

async function runStep(sessionId: string) {
  const session = sessionById(sessionId);
  const esc = escalationOf(sessionId);
  if (!session || !esc || esc.done) return;
  if (session.status === "ended") return finish(sessionId, "she ended the walk with her PIN");
  const acks = acksFor(sessionId);
  if (acks.length) return finish(sessionId, `${acks[0].name} is on it`);

  const contacts = innerContacts(session.user_id);
  if (contacts.length === 0) return finish(sessionId, "no inner-circle contacts to escalate to");

  if (esc.level >= URGENT_LEVEL || esc.step >= contacts.length) {
    const name = userName(session.user_id);
    const text = `SafeWalk alert: No one has confirmed they are helping ${name} yet (${formatTime(Date.now())}). Please call 112 now and share her live location with them: ${guardianUrl(session)}`;
    await sendToInner(session, text);
    recordAgentEvent(sessionId, "fallback", text, contacts.map((c) => c.name).join(", "));
    return finish(
      sessionId,
      esc.level >= URGENT_LEVEL ? "urgent level — told everyone to call 112" : "all contacts tried — told everyone to call 112",
    );
  }

  const target = contacts[esc.step];
  const outcome = await runAgent(
    sessionId,
    `Escalation step ${esc.step + 1} of ${contacts.length}. Nobody has pressed "I'm on it" yet.
Send exactly ONE message with send_notification to contact_id "${target.id}" (${target.name}).
Tell ${target.name} what is happening (from get_session_context), ask them to open the live link, try calling her, and press "I'm on it" on that page if they are responding.
If the situation looks dangerous (duress PIN, safety word, SOS, worrying words heard, phone silent for long), call raise_alert_level.`,
  );
  if (!outcome.ok) recordAgentEvent(sessionId, "error", `Agent step failed: ${outcome.error}`);
  if (!outcome.state.sentTo.has(target.id)) {
    const name = userName(session.user_id);
    const text = `SafeWalk alert: ${name} may need help and no one has confirmed yet (${formatTime(Date.now())}). ${target.name}, please open the live link, try calling her, and press "I'm on it" if you are responding: ${guardianUrl(session)}`;
    await notify({ name: target.name, telegramChatId: target.telegram_chat_id }, text, { sessionId, kind: "escalation" });
    recordAgentEvent(sessionId, "fallback", "Sent the fixed escalation message (agent unavailable).", target.name);
  }

  const latest = escalationOf(sessionId)!;
  const nextAt = latest.level >= URGENT_LEVEL ? Date.now() : Date.now() + waitMs(session);
  run("UPDATE escalations SET step = step + 1, next_at = ?, running = 0 WHERE session_id = ? AND done = 0", nextAt, sessionId);
}

// F2 step 3: AI follow-up to the whole inner circle after a keyword or SOS.
async function runFollowUp(sessionId: string) {
  const session = sessionById(sessionId);
  if (!session) return;
  const outcome = await runAgent(
    sessionId,
    `The phone just triggered an emergency (${session.keyword ? `safety word "${session.keyword}" heard` : "SOS button pressed"}). A fixed alert already went out.
Send ONE follow-up message to EVERY inner-circle contact (call send_notification once per contact) that includes: what triggered it, any words the phone heard, where she is and whether she is moving (location trail), battery, and the nearest police station from find_nearby (name, phone, distance, "Source: Google Maps").
Then decide whether to call raise_alert_level.`,
  );
  if (!outcome.ok) recordAgentEvent(sessionId, "error", `Agent follow-up failed: ${outcome.error}`);
  const missing = innerContacts(session.user_id).filter((c) => !outcome.state.sentTo.has(c.id));
  if (missing.length === 0) return;

  // Fallback: plain-code follow-up, still using only Google Places data.
  let police = "";
  const loc = lastLocation(sessionId);
  if (loc) {
    try {
      const [p] = await findNearby("police", loc.lat, loc.lng, 1);
      if (p) police = ` Nearest police station: ${p.name}${p.phone ? `, ${p.phone}` : ""}, about ${(p.distanceM / 1000).toFixed(1)} km away (Source: Google Maps).`;
    } catch (err) {
      log.warn(`fallback places lookup failed: ${(err as Error).message}`);
    }
  }
  const name = userName(session.user_id);
  const text = `SafeWalk update: ${name}'s phone is recording audio after the alert.${police} Live link: ${guardianUrl(session)}`;
  await Promise.all(missing.map((c) => notify({ name: c.name, telegramChatId: c.telegram_chat_id }, text, { sessionId, kind: "ai" })));
  recordAgentEvent(sessionId, "fallback", "Sent the fixed follow-up (agent unavailable).", missing.map((c) => c.name).join(", "));
}

// Summaries of panic-mode transcripts: at most one per minute per session, only when new text exists.
const summaryState = new Map<string, { lastSeq: number; timer?: NodeJS.Timeout; lastAt: number }>();
const SUMMARY_DELAY_MS = 20_000;
const SUMMARY_MIN_GAP_MS = 60_000;

export function scheduleSummary(sessionId: string) {
  const st = summaryState.get(sessionId) ?? { lastSeq: -1, lastAt: 0 };
  summaryState.set(sessionId, st);
  if (st.timer) return;
  const delay = Math.max(SUMMARY_DELAY_MS, st.lastAt + SUMMARY_MIN_GAP_MS - Date.now());
  st.timer = setTimeout(() => {
    st.timer = undefined;
    void runSummary(sessionId, st).catch((err) => log.error(`summary failed: ${(err as Error).message}`));
  }, delay);
}

async function runSummary(sessionId: string, st: { lastSeq: number; lastAt: number }) {
  const maxSeq =
    getOne<{ m: number | null }>("SELECT MAX(seq) AS m FROM audio_chunks WHERE session_id = ? AND transcript IS NOT NULL", sessionId)?.m ?? -1;
  if (maxSeq <= st.lastSeq) return;
  st.lastSeq = maxSeq;
  st.lastAt = Date.now();
  const outcome = await runAgent(
    sessionId,
    `New speech-to-text from her panic-mode audio is available. Call get_transcripts.
Write a short factual summary (what was said, names or places mentioned, signs of danger; quote key words exactly; say "unclear" when unsure) and send it with send_notification to EVERY inner-circle contact.
If the words suggest danger, call raise_alert_level.`,
    "summary",
  );
  if (!outcome.ok) recordAgentEvent(sessionId, "error", `Agent summary failed: ${outcome.error}`);
}
