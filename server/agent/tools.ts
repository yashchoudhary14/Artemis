// The SDK's own AgentTool type resolves to `any` under NodeNext, so we keep a local shape.
export interface AgentTool<I> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: I): Promise<unknown>;
}
import { guardianUrl, innerContacts, lastLocation } from "../src/alerts.js";
import { run, type SessionRow } from "../src/db.js";
import { allHelplineNumbers, helplinesFor } from "../src/helplines.js";
import { notify } from "../src/notify/index.js";
import { findNearby, type PlaceType } from "../src/places.js";
import { acksFor, sessionById, sessionContext, snippetsFor, transcriptsFor } from "./context.js";
import { recordAgentEvent } from "./events.js";
import { unknownNumbers } from "./safety.js";

// Safety rule 4: code (not the model) adds this label and the link to the original audio.
export const AI_LABEL = "AI summary â€” may contain errors.";

export function aiFooter(session: SessionRow): string {
  return `\n\n${AI_LABEL} Original audio and live map: ${guardianUrl(session)}`;
}

export interface RunState {
  /** Contact ids that received a message in this run. */
  sentTo: Set<string>;
  /** Phone numbers the model has seen from trusted sources in this run. */
  allowedNumbers: Set<string>;
  /** Highest alert level the model asked for (only ever goes up). */
  raisedLevel: number;
  kind: "message" | "summary";
}

const MAX_MESSAGE_CHARS = 700;

// Each run gets fresh tools bound to one session. The tools only read data or send
// to the user's own inner circle; none of them can cancel or lower an alert.
export function buildTools(sessionId: string, state: RunState): AgentTool<any>[] {
  const session = () => sessionById(sessionId)!;
  for (const n of allHelplineNumbers()) state.allowedNumbers.add(n);

  const getSessionContext: AgentTool<Record<string, never>> = {
    name: "get_session_context",
    description:
      "Who the person is, what triggered the alert, location trail, battery, words the phone heard, inner-circle contacts and acknowledgements.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      return sessionContext(session());
    },
  };

  const sendNotification: AgentTool<{ contact_id: string; text: string }> = {
    name: "send_notification",
    description:
      "Send one message to an inner-circle contact. Plain text, calm and factual, max 700 characters. Do not include the live link or an AI label: they are added automatically.",
    inputSchema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "contactId from get_session_context.innerCircle" },
        text: { type: "string" },
      },
      required: ["contact_id", "text"],
    },
    async execute({ contact_id, text }) {
      const s = session();
      const contact = innerContacts(s.user_id).find((c) => c.id === contact_id);
      if (!contact) throw new Error("contact_id is not in this person's inner circle");
      const body = String(text ?? "").trim();
      if (!body) throw new Error("text is empty");
      if (body.length > MAX_MESSAGE_CHARS) throw new Error(`text is too long (max ${MAX_MESSAGE_CHARS} characters)`);
      const unknown = unknownNumbers(body, state.allowedNumbers);
      if (unknown.length) {
        recordAgentEvent(s.id, "blocked", `Blocked a message with unverified number(s): ${unknown.join(", ")}`);
        throw new Error(
          `Message rejected: it contains number(s) not from get_helplines or find_nearby (${unknown.join(", ")}). Remove them or use only verified numbers.`,
        );
      }
      const full = `SafeWalk: ${body}${aiFooter(s)}`;
      const ok = await notify({ name: contact.name, telegramChatId: contact.telegram_chat_id }, full);
      state.sentTo.add(contact.id);
      recordAgentEvent(s.id, state.kind, body, contact.name);
      return { sent: ok, to: contact.name };
    },
  };

  const checkAcknowledgements: AgentTool<Record<string, never>> = {
    name: "check_acknowledgements",
    description: "Who has pressed \"I'm on it\" on the live link page.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      const acks = acksFor(sessionId);
      return { anyoneOnIt: acks.length > 0, acknowledgements: acks.map((a) => a.name) };
    },
  };

  const findNearbyTool: AgentTool<{ type: PlaceType }> = {
    name: "find_nearby",
    description:
      "Nearest hospitals or police stations to the person's last location, from the Google Places API (the only allowed source of places and their phone numbers).",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", enum: ["hospital", "police"] } },
      required: ["type"],
    },
    async execute({ type }) {
      const loc = lastLocation(sessionId);
      if (!loc) return { places: [], note: "No location available for this person." };
      const places = await findNearby(type === "hospital" ? "hospital" : "police", loc.lat, loc.lng, 3);
      for (const p of places) if (p.phone) state.allowedNumbers.add(p.phone);
      return {
        source: "Google Maps",
        places: places.map((p) => ({ name: p.name, phone: p.phone, address: p.address, distanceM: p.distanceM })),
      };
    },
  };

  const getHelplines: AgentTool<Record<string, never>> = {
    name: "get_helplines",
    description: "Verified Indian helpline numbers (national + the person's state) with what each is for.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      return {
        helplines: helplinesFor(session().state).map((h) => ({ number: h.number, purpose: h.purpose, coverage: h.coverage })),
      };
    },
  };

  const getTranscripts: AgentTool<Record<string, never>> = {
    name: "get_transcripts",
    description: "Speech-to-text of the panic-mode audio chunks (10 s each), plus words the phone heard before the trigger.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      return { audioChunks: transcriptsFor(sessionId), wordsHeardBeforeTrigger: snippetsFor(sessionId).map((s) => s.text) };
    },
  };

  const raiseAlertLevel: AgentTool<{ level: number; reason: string }> = {
    name: "raise_alert_level",
    description:
      "Raise the alert level (1 = normal escalation, 2 = serious, 3 = urgent: message everyone now and tell them to call 112). It can only go up, never down.",
    inputSchema: {
      type: "object",
      properties: { level: { type: "integer", minimum: 2, maximum: 3 }, reason: { type: "string" } },
      required: ["level", "reason"],
    },
    async execute({ level, reason }) {
      const next = Math.max(2, Math.min(3, Math.round(Number(level) || 2)));
      state.raisedLevel = Math.max(state.raisedLevel, next);
      // Safety rule 2: MAX() in SQL so the level can never decrease.
      run("UPDATE escalations SET level = MAX(level, ?) WHERE session_id = ?", next, sessionId);
      recordAgentEvent(sessionId, "level", `Raised alert level to ${next}: ${reason}`);
      return { level: next };
    },
  };

  return [getSessionContext, sendNotification, checkAcknowledgements, findNearbyTool, getHelplines, getTranscripts, raiseAlertLevel];
}
