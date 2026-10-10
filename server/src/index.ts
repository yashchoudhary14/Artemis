import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startWatchdog } from "./watchdog.js";
import { startTelegramPolling } from "./telegramLink.js";
import { resetRunningEscalations } from "../agent/escalation.js";
import { agentEnabled } from "../agent/runner.js";

const app = await buildApp();

try {
  // 0.0.0.0 so phones on the same Wi-Fi/hotspot can reach the laptop directly.
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Public base URL: ${config.publicBaseUrl}`);
  app.log.info(`Notifier: ${config.notifyProvider}`);
  app.log.info(
    agentEnabled()
      ? `Agent: Cline SDK, ${config.agentProvider} / ${config.agentModel}`
      : "Agent: CLINE_API_KEY not set — escalation uses fixed templates only",
  );
  resetRunningEscalations();
  startWatchdog();
  void startTelegramPolling();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
