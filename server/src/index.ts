import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startWatchdog } from "./watchdog.js";
import { startTelegramPolling } from "./telegramLink.js";

const app = await buildApp();

try {
  // 0.0.0.0 so phones on the same Wi-Fi/hotspot can reach the laptop directly.
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Public base URL: ${config.publicBaseUrl}`);
  app.log.info(`Notifier: ${config.notifyProvider}`);
  startWatchdog();
  void startTelegramPolling();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
