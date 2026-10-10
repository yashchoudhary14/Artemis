import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { setLogger } from "./log.js";
import { userRoutes } from "./routes/users.js";
import { sessionRoutes } from "./routes/sessions.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export async function buildApp() {
  const app = Fastify({ logger: { level: "info" } });
  setLogger(app.log);
  await app.register(cors, { origin: true });
  await app.register(fastifyStatic, { root: publicDir });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: "invalid request", issues: err.issues });
    app.log.error(err);
    return reply.code(500).send({ error: "server error" });
  });

  app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));
  await app.register(userRoutes);
  await app.register(sessionRoutes);

  return app;
}
