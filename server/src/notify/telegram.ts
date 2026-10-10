import { config } from "../config.js";
import { log } from "../log.js";
import type { Notifier } from "./index.js";

const api = () => `https://api.telegram.org/bot${config.telegramBotToken}`;

export async function telegramSend(chatId: string, text: string): Promise<void> {
  const res = await fetch(`${api()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  if (!body.ok) throw new Error(`Telegram: ${body.description ?? res.status}`);
}

export const telegramNotifier: Notifier = {
  async send(to, text) {
    if (!config.telegramBotToken) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    if (!to.telegramChatId) throw new Error("contact has not opened the Telegram link yet");
    await telegramSend(to.telegramChatId, text);
    log.info(`[telegram] sent to ${to.name}`);
  },
};
