import { config } from "../config.js";
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

const active: Notifier = config.notifyProvider === "telegram" ? telegramNotifier : consoleNotifier;

// Single entry point for every outgoing message. Never throws: a failed send is
// logged with the full text so the alert is never silently lost.
export async function notify(to: Recipient, text: string): Promise<boolean> {
  try {
    await active.send(to, text);
    return true;
  } catch (err) {
    log.error(`notify failed for ${to.name}: ${(err as Error).message}`, { text });
    return false;
  }
}
