import { config } from "./config.js";
import { getOne, run, type ContactRow, type UserRow } from "./db.js";
import { log } from "./log.js";
import { telegramSend } from "./notify/telegram.js";

// A contact links Telegram by opening t.me/<bot>?start=<code> and pressing Start.
// We long-poll getUpdates and save their chat_id. Only ONE running server may poll a
// given bot token at a time (Telegram returns 409 Conflict otherwise).

export function telegramLinkUrl(code: string): string | null {
  return config.telegramBotUsername ? `https://t.me/${config.telegramBotUsername}?start=${code}` : null;
}

interface Update {
  update_id: number;
  message?: { chat: { id: number }; text?: string; from?: { first_name?: string } };
}

async function handleUpdate(u: Update) {
  const text = u.message?.text?.trim() ?? "";
  const chatId = u.message?.chat.id;
  if (!chatId || !text.startsWith("/start")) return;
  const code = text.split(/\s+/)[1]?.toUpperCase();
  const contact = code ? getOne<ContactRow>("SELECT * FROM contacts WHERE link_code = ?", code) : undefined;
  if (!contact) {
    await telegramSend(String(chatId), "This link is not valid. Ask your friend to share the SafeWalk contact link again.");
    return;
  }
  run("UPDATE contacts SET telegram_chat_id = ? WHERE id = ?", String(chatId), contact.id);
  const user = getOne<UserRow>("SELECT name FROM users WHERE id = ?", contact.user_id);
  log.info(`telegram linked: contact ${contact.name} (${contact.id})`);
  await telegramSend(
    String(chatId),
    `You are now an emergency contact for ${user?.name ?? "your friend"} on SafeWalk. If she needs help, you will get a message here with her live location.`,
  );
}

export async function startTelegramPolling(): Promise<void> {
  if (!config.telegramBotToken) {
    log.warn("TELEGRAM_BOT_TOKEN not set: contact linking is disabled");
    return;
  }
  const api = `https://api.telegram.org/bot${config.telegramBotToken}`;
  let offset = 0;
  for (;;) {
    try {
      const res = await fetch(`${api}/getUpdates?timeout=25&offset=${offset}&allowed_updates=["message"]`);
      const body = (await res.json()) as { ok: boolean; result?: Update[]; description?: string };
      if (!body.ok) throw new Error(body.description ?? `HTTP ${res.status}`);
      for (const u of body.result ?? []) {
        offset = u.update_id + 1;
        await handleUpdate(u).catch((err) => log.error(`telegram update failed: ${(err as Error).message}`));
      }
    } catch (err) {
      log.warn(`telegram polling error (retrying in 5 s): ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
