import { Agent } from "@cline/sdk";
import { config } from "../src/config.js";
import { recordAgentEvent } from "./events.js";
import { buildTools, type RunState } from "./tools.js";

const SYSTEM_PROMPT = `You are the SafeWalk escalation assistant. A person in India may be in danger and a fixed alert has ALREADY been sent to her family by the app. Your job is only to add to it: write clear follow-up messages to her emergency contacts and decide whether the situation is more urgent.

Rules you must never break:
- Never say or imply she is safe, never tell anyone to stand down, never cancel anything. You can only raise the alert level.
- Never invent phone numbers, places, names or facts. Only use phone numbers returned by get_helplines or find_nearby, and only places from find_nearby (say "Source: Google Maps" when you name one).
- Calm, factual wording, like: "Lost contact with Priya near MG Road at 9:42 pm, battery 12%." No drama, no emojis, no speculation stated as fact.
- Messages are plain text, short (under 600 characters), simple English that a parent can act on.
- Do not paste the live link and do not add an AI label: the app appends both.
- Always call get_session_context first. Use tools; do not ask questions back. When the task is done, reply with one short line saying what you did.`;

export interface AgentRunOutcome {
  ok: boolean;
  state: RunState;
  output: string;
  error?: string;
}

export const agentEnabled = () => Boolean(config.clineApiKey);

// One bounded agent run for one session. Never throws: the caller falls back to a template.
export async function runAgent(sessionId: string, task: string, kind: RunState["kind"] = "message"): Promise<AgentRunOutcome> {
  const state: RunState = { sentTo: new Set(), allowedNumbers: new Set(), raisedLevel: 0, kind };
  if (!agentEnabled()) return { ok: false, state, output: "", error: "CLINE_API_KEY not set" };

  const agent = new Agent({
    providerId: config.agentProvider,
    modelId: config.agentModel,
    apiKey: config.clineApiKey,
    systemPrompt: SYSTEM_PROMPT,
    tools: buildTools(sessionId, state),
    maxIterations: 8,
  });
  agent.subscribe((event: { type: string; toolCall?: { toolName: string; input: unknown } }) => {
    if (event.type === "tool-started" && event.toolCall) {
      const input = JSON.stringify(event.toolCall.input ?? {});
      recordAgentEvent(sessionId, "tool", `${event.toolCall.toolName}(${input.length > 160 ? input.slice(0, 160) + "…" : input})`);
    }
  });

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      agent.abort("timeout");
      reject(new Error(`agent timed out after ${config.agentTimeoutSeconds}s`));
    }, config.agentTimeoutSeconds * 1000);
  });
  try {
    const result = await Promise.race([agent.run(task), timeout]);
    const ok = result.status === "completed";
    return { ok, state, output: result.outputText, error: ok ? undefined : (result.error?.message ?? result.status) };
  } catch (err) {
    return { ok: false, state, output: "", error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}
