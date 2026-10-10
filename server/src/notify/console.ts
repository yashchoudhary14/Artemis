import { log } from "../log.js";
import type { Notifier } from "./index.js";

// For testing without Telegram: messages only appear in the server log.
export const consoleNotifier: Notifier = {
  async send(to, text) {
    log.info(`[console notify] to ${to.name}: ${text}`);
  },
};
