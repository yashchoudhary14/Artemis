import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();

try {
  // 0.0.0.0 so phones on the same Wi-Fi/hotspot can reach the laptop directly.
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Public base URL: ${config.publicBaseUrl}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
