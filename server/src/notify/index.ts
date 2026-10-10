import { config } from "../config.js";
import { run } from "../db.js";
import { log } from "../log.js";
import { consoleNotifier } from "./console.js";
import { telegramNotifier } from "./telegram.js";

export interface Recipient {
  name: string;
  telegramChatId: string | null;
}

export interface Notifier {
  send(to: Recipient, text: string): Promise<void>;
}

/** Optional: record the attempt so the phone can show "sent to Mum ✓". */
export interface DeliveryLog {
  sessionId: string;
  /** alert | update | ai | escalation */
  kind: string;
}

const active: Notifier = config.notifyProvider === "telegram" ? telegramNotifier : consoleNotifier;

// Single entry point for every outgoing message. Never throws: a failed send is
// logged with the full text so the alert is never silently lost.
export async function notify(to: Recipient, text: string, delivery?: DeliveryLog): Promise<boolean> {
  let ok = true;
  let error: string | null = null;
  try {
    await active.send(to, text);
  } catch (err) {
    ok = false;
    error = (err as Error).message;
    log.error(`notify failed for ${to.name}: ${error}`, { text });
  }
  if (delivery) {
    try {
      run(
        "INSERT INTO deliveries (session_id, contact_name, kind, ok, error, at) VALUES (?, ?, ?, ?, ?, ?)",
        delivery.sessionId, to.name, delivery.kind, ok ? 1 : 0, error, Date.now(),
      );
    } catch (err) {
      log.warn(`could not record delivery: ${(err as Error).message}`);
    }
  }
  return ok;
}
