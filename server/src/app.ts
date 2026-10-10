import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { setLogger } from "./log.js";
import "./buddy/db.js";
import { buddyRoutes } from "./buddy/routes.js";
import { audioRoutes } from "./routes/audio.js";
import { guardianRoutes } from "./routes/guardian.js";
import { helpRoutes } from "./routes/help.js";
import { userRoutes } from "./routes/users.js";
import { sessionRoutes } from "./routes/sessions.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export async function buildApp() {
  const app = Fastify({ logger: { level: "info" }, bodyLimit: 1024 * 1024 });
  setLogger(app.log);
  await app.register(cors, { origin: true });
  await app.register(fastifyStatic, { root: publicDir });
  // Audio chunks (10 s) and profile photos.
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: "invalid request", issues: err.issues });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) return reply.code(status).send({ error: (err as Error).message });
    app.log.error(err);
    return reply.code(500).send({ error: "server error" });
  });

  app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));
  await app.register(userRoutes);
  await app.register(sessionRoutes);
  await app.register(audioRoutes);
  await app.register(helpRoutes);
  await app.register(guardianRoutes);
  await app.register(buddyRoutes);

  return app;
}
