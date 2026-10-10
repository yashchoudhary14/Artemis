import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import path from "node:path";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export async function buildApp() {
  const app = Fastify({ logger: { level: "info" } });
  await app.register(cors, { origin: true });
  await app.register(fastifyStatic, { root: publicDir });

  app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));

  return app;
}
