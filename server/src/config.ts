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
  heartbeatTimeoutSeconds: num("HEARTBEAT_TIMEOUT_SECONDS", 45),
  escalationWaitSeconds: num("ESCALATION_WAIT_SECONDS", 300),
};
