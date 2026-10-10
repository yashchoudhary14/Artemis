import { Agent } from "@cline/sdk";
import { z } from "zod";
import { formatTime, mapsLink } from "../src/alerts.js";
import { config } from "../src/config.js";
import { getAll, type SessionRow } from "../src/db.js";
import { allHelplineNumbers } from "../src/helplines.js";
import { log } from "../src/log.js";
import { findNearby, type Place } from "../src/places.js";
import { acksFor, locationTrail, sessionContext, transcriptsFor } from "./context.js";
import { agentEnabled } from "./runner.js";
import { unknownNumbers } from "./safety.js";
import type { AgentTool } from "./tools.js";

// Two non-emergency uses of the Cline agent:
//  1. Walk briefing: before a walk, three short tips from real data (time, light, nearby help).
//  2. Incident report: after an SOS, a plain report from the session record and transcripts.
// Both are read-only (no tool can send anything) and both have a plain-code fallback.

async function runReadOnlyAgent(systemPrompt: string, tools: AgentTool<any>[], task: string): Promise<string | null> {
  if (!agentEnabled()) return null;
  const agent = new Agent({
    providerId: config.agentProvider,
    modelId: config.agentModel,
    apiKey: config.clineApiKey,
    systemPrompt,
    tools,
    maxIterations: 6,
  });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      agent.abort("timeout");
      reject(new Error("timeout"));
    }, config.agentTimeoutSeconds * 1000);
  });
  try {
    const result = await Promise.race([agent.run(task), timeout]);
    return result.status === "completed" ? result.outputText : null;
  } catch (err) {
    log.warn(`companion agent failed: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** First {...} block in the model's reply, parsed and validated. */
function parseJson<T>(text: string | null, schema: z.ZodType<T>): T | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const r = schema.safeParse(JSON.parse(m[0]));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

// ---------- sun times (NOAA approximation, good to a few minutes) ----------

export function sunTimes(lat: number, lng: number, date = new Date()): { sunrise: number; sunset: number } | null {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  if (cosH < -1 || cosH > 1) return null;
  const ha = Math.acos(cosH) / rad;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const minutes = (m: number) => midnight + m * 60000;
  return { sunrise: minutes(720 - 4 * (lng + ha) - eqtime), sunset: minutes(720 - 4 * (lng - ha) - eqtime) };
}

// ---------- 1. walk briefing ----------

export interface BriefingInput {
  lat?: number;
  lng?: number;
  destination?: string;
  timerMinutes?: number;
  name: string;
}
export interface Briefing {
  tips: string[];
  byAi: boolean;
  source: string;
}

const BRIEFING_PROMPT = `You are Artemis, a calm safety companion in an Indian women's safety app. Before she walks, give exactly three short, practical tips for this walk.

Rules:
- Use only facts from your tools. Never invent places, phone numbers, street lighting or crime facts.
- If you name a place, it must come from find_nearby (Google Maps). Include its distance.
- Each tip is one sentence, under 110 characters, plain English, no emojis, no fear-mongering.
- Useful topics: whether it is dark (from get_conditions), the nearest hospital or police station on her way, whether her timer leaves spare time, sharing her live link.
- Reply with ONLY this JSON: {"tips": ["...", "...", "..."]}`;

const briefingSchema = z.object({ tips: z.array(z.string().min(3).max(160)).min(1).max(3) });
const briefCache = new Map<string, { at: number; value: Briefing }>();

export async function walkBriefing(input: BriefingInput): Promise<Briefing> {
  const key = `${input.lat?.toFixed(3)},${input.lng?.toFixed(3)},${input.destination ?? ""},${input.timerMinutes ?? ""}`;
  const hit = briefCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;

  const now = Date.now();
  const sun = input.lat != null && input.lng != null ? sunTimes(input.lat, input.lng) : null;
  const dark = sun ? now > sun.sunset || now < sun.sunrise : new Date().getHours() >= 18 || new Date().getHours() < 6;
  const places: Partial<Record<"hospital" | "police", Place[]>> = {};
  const allowed = new Set(allHelplineNumbers());

  const nearby = async (type: "hospital" | "police") => {
    if (input.lat == null || input.lng == null) return [];
    if (!places[type]) {
      try {
        places[type] = await findNearby(type, input.lat, input.lng, 3);
      } catch {
        places[type] = [];
      }
    }
    for (const p of places[type]!) if (p.phone) allowed.add(p.phone);
    return places[type]!;
  };

  const tools: AgentTool<any>[] = [
    {
      name: "get_conditions",
      description: "Local time, sunset time and whether it is dark now, plus her destination and check-in timer.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return {
          name: input.name,
          localTime: formatTime(now),
          sunset: sun ? formatTime(sun.sunset) : "unknown",
          isDark: dark,
          destination: input.destination ?? "not given",
          timerMinutes: input.timerMinutes ?? "not set",
        };
      },
    },
    {
      name: "find_nearby",
      description: "Nearest hospitals or police stations to her current location (Google Maps), with distance in metres.",
      inputSchema: { type: "object", properties: { type: { type: "string", enum: ["hospital", "police"] } }, required: ["type"] },
      async execute({ type }: { type: "hospital" | "police" }) {
        const list = await nearby(type === "police" ? "police" : "hospital");
        return { source: "Google Maps", places: list.map((p) => ({ name: p.name, distanceM: p.distanceM })) };
      },
    },
  ];

  const task = `Write the three tips for ${input.name}'s walk${input.destination ? ` to ${input.destination}` : ""}. Call get_conditions and find_nearby first.`;
  const ai = parseJson(await runReadOnlyAgent(BRIEFING_PROMPT, tools, task), briefingSchema);
  let value: Briefing;
  if (ai && ai.tips.every((t) => unknownNumbers(t, allowed).length === 0)) {
    value = { tips: ai.tips, byAi: true, source: places.hospital || places.police ? "AI, from Google Maps" : "AI" };
  } else {
    // Plain-code fallback from the same facts.
    const tips: string[] = [];
    tips.push(dark ? `It's dark${sun ? ` since ${formatTime(sun.sunset)}` : ""}. Stick to busy, lit roads.` : `Daylight${sun ? ` until ${formatTime(sun.sunset)}` : ""}. Keep your live link on anyway.`);
    const h = (await nearby("hospital"))[0];
    const p = (await nearby("police"))[0];
    const dist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
    if (h) tips.push(`Nearest hospital: ${h.name}, ${dist(h.distanceM)}.`);
    if (p) tips.push(`Nearest police: ${p.name}, ${dist(p.distanceM)}.`);
    if (tips.length < 3) tips.push(input.timerMinutes ? `If you're not there in ${input.timerMinutes} min, your circle hears from Artemis.` : "Set a timer so your circle knows when to expect you.");
    value = { tips: tips.slice(0, 3), byAi: false, source: h || p ? "Google Maps" : "Artemis" };
  }
  briefCache.set(key, { at: Date.now(), value });
  return value;
}

// ---------- 2. incident report ----------

export interface IncidentReport {
  summary: string;
  timeline: { time: string; text: string }[];
  byAi: boolean;
  generatedAt: number;
}

const REPORT_PROMPT = `You write a short, factual incident report for a woman who used the SOS feature of a safety app in India. She may share it with the police.

Rules:
- Use only facts from your tools. Never guess who someone was or what happened beyond what the record and transcripts say.
- Quote transcript words exactly, in quotes, and only if they appear in get_transcripts.
- Write in second person ("You pressed SOS..."). Calm, plain English, no emojis, no speculation.
- summary: 2 to 4 sentences. timeline: 3 to 8 entries in time order, each under 100 characters.
- Reply with ONLY this JSON: {"summary": "...", "timeline": [{"time": "7:46 pm", "text": "..."}]}`;

const reportSchema = z.object({
  summary: z.string().min(10).max(800),
  timeline: z.array(z.object({ time: z.string().max(20), text: z.string().max(200) })).min(1).max(10),
});
const reportCache = new Map<string, { at: number; value: IncidentReport }>();

function factTimeline(s: SessionRow) {
  const items: { at: number; text: string }[] = [];
  items.push({ at: s.created_at, text: s.kind === "panic" || s.panic_at ? "SOS started." : `Session started (${s.kind}).` });
  for (const a of getAll<{ type: string; created_at: number }>("SELECT type, created_at FROM alerts WHERE session_id = ? ORDER BY created_at", s.id)) {
    items.push({ at: a.created_at, text: `Alert sent to your circle (${a.type}).` });
  }
  for (const a of acksFor(s.id)) items.push({ at: a.at, text: `${a.name} pressed I'm on it.` });
  if (s.ended_at) items.push({ at: s.ended_at, text: "Ended with your PIN." });
  return items.sort((a, b) => a.at - b.at);
}

export async function incidentReport(s: SessionRow): Promise<IncidentReport> {
  const hit = reportCache.get(s.id);
  if (hit && (s.status !== "active" || Date.now() - hit.at < 60_000)) return hit.value;

  const facts = factTimeline(s);
  const tools: AgentTool<any>[] = [
    {
      name: "get_session_record",
      description: "The session: who, what triggered it, alerts, acknowledgements, location trail and battery.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        const ctx = sessionContext(s);
        return { ...ctx, liveLink: undefined, events: facts.map((f) => ({ at: formatTime(f.at), what: f.text })) };
      },
    },
    {
      name: "get_transcripts",
      description: "Speech-to-text of the recorded audio clips, in order, with times.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return { transcripts: transcriptsFor(s.id) };
      },
    },
  ];
  const ai = parseJson(await runReadOnlyAgent(REPORT_PROMPT, tools, "Write the incident report. Call both tools first."), reportSchema);
  const allowed = new Set(allHelplineNumbers());
  const clean = ai && [ai.summary, ...ai.timeline.map((t) => t.text)].every((t) => unknownNumbers(t, allowed).length === 0);

  let value: IncidentReport;
  if (ai && clean) {
    value = { ...ai, byAi: true, generatedAt: Date.now() };
  } else {
    const last = locationTrail(s.id).at(-1);
    const heard = transcriptsFor(s.id).map((t) => t.text).filter(Boolean).slice(0, 2);
    const summary =
      `At ${formatTime(s.created_at)} you ${s.panic_at ? "pressed SOS" : "started a session"}.` +
      (last ? ` Your last shared location was ${mapsLink(last)}.` : "") +
      (heard.length ? ` The recording heard: "${heard.join(" ")}".` : "") +
      (s.ended_at ? ` You ended it with your PIN at ${formatTime(s.ended_at)}.` : "");
    value = { summary, timeline: facts.map((f) => ({ time: formatTime(f.at), text: f.text })), byAi: false, generatedAt: Date.now() };
  }
  reportCache.set(s.id, { at: Date.now(), value });
  return value;
}
