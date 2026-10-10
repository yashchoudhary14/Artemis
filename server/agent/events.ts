import { run } from "../src/db.js";
import { log } from "../src/log.js";

// kind: message | summary | level | tool | fallback | blocked | error | done
export function recordAgentEvent(sessionId: string, kind: string, text: string, recipient: string | null = null) {
  run(
    "INSERT INTO agent_events (session_id, kind, text, recipient, at) VALUES (?, ?, ?, ?, ?)",
    sessionId,
    kind,
    text,
    recipient,
    Date.now(),
  );
  log.info(`[agent ${kind}]${recipient ? ` to ${recipient}` : ""} ${text}`, { sessionId });
}
