// Central place for reading environment variables, with safe defaults for local testing.
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: num("PORT", 3000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  notifyProvider: process.env.NOTIFY_PROVIDER ?? "console",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, ""),
  heartbeatTimeoutSeconds: num("HEARTBEAT_TIMEOUT_SECONDS", 45),
  escalationWaitSeconds: num("ESCALATION_WAIT_SECONDS", 300),
  // Agent (Cline SDK). The agent is optional: without a key every step falls back to templates.
  clineApiKey: process.env.CLINE_API_KEY ?? "",
  agentProvider: process.env.AGENT_PROVIDER ?? "cline",
  agentModel: process.env.AGENT_MODEL ?? "anthropic/claude-haiku-5.5",
  agentTimeoutSeconds: num("AGENT_TIMEOUT_SECONDS", 25),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  instituteEmailDomain: (process.env.INSTITUTE_EMAIL_DOMAIN ?? "").replace(/^@/, "").toLowerCase(),
  // Times in alert messages are shown in Indian Standard Time (demo is in Guwahati).
  timeZone: "Asia/Kolkata",
};
