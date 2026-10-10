// Central place for reading environment variables, with safe defaults for local testing.
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: num("PORT", 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
  notifyProvider: process.env.NOTIFY_PROVIDER ?? "console",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, ""),
  heartbeatTimeoutSeconds: num("HEARTBEAT_TIMEOUT_SECONDS", 45),
  escalationWaitSeconds: num("ESCALATION_WAIT_SECONDS", 300),
  // Times in alert messages are shown in Indian Standard Time (demo is in Guwahati).
  timeZone: "Asia/Kolkata",
};
