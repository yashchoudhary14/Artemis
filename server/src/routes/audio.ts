import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dataDir, getOne, run, type AudioChunkRow, type SessionRow } from "../db.js";
import { log } from "../log.js";
import { stt } from "../stt/index.js";
import { scheduleSummary } from "../../agent/escalation.js";
import { authUser } from "./common.js";

export const audioDir = path.join(dataDir, "audio");

const query = z.object({
  seq: z.coerce.number().int().min(0).max(100000),
  startedAt: z.coerce.number().int().optional(),
});

const EXT: Record<string, string> = {
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm",
  "audio/3gpp": ".3gp",
  "audio/ogg": ".ogg",
};

async function transcribe(chunk: AudioChunkRow) {
  try {
    const text = await stt.transcribe(path.join(audioDir, chunk.file), chunk.mime);
    run("UPDATE audio_chunks SET transcript = ?, transcribed_at = ? WHERE id = ?", text, Date.now(), chunk.id);
    log.info(`transcribed chunk ${chunk.seq} of ${chunk.session_id}: ${text.slice(0, 80)}`);
    if (text) scheduleSummary(chunk.session_id);
  } catch (err) {
    log.warn(`transcription failed for chunk ${chunk.seq}: ${(err as Error).message}`);
  }
}

export async function audioRoutes(app: FastifyInstance) {
  // Panic mode: one 10 s chunk per request, as soon as it is recorded.
  // seq is in the query string; uploading the same seq twice is a no-op (phone retries are safe).
  app.post<{ Params: { id: string } }>("/sessions/:id/audio", async (req, reply) => {
    const user = authUser(req, reply);
    if (!user) return;
    const s = getOne<SessionRow>("SELECT * FROM sessions WHERE id = ? AND user_id = ?", req.params.id, user.id);
    if (!s) return reply.code(404).send({ error: "session not found" });
    const q = query.parse(req.query);
    const dupe = getOne<AudioChunkRow>("SELECT * FROM audio_chunks WHERE session_id = ? AND seq = ?", s.id, q.seq);
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no file" });
    if (dupe) {
      file.file.resume(); // drain and ignore
      return { ok: true, seq: q.seq, duplicate: true };
    }
    const mime = file.mimetype && file.mimetype !== "application/octet-stream" ? file.mimetype : "audio/mp4";
    const ext = EXT[mime] ?? (path.extname(file.filename || "") || ".m4a");
    const rel = path.join(s.id, `${String(q.seq).padStart(5, "0")}${ext}`);
    mkdirSync(path.join(audioDir, s.id), { recursive: true });
    await pipeline(file.file, createWriteStream(path.join(audioDir, rel)));
    if (file.file.truncated) return reply.code(413).send({ error: "chunk too large" });
    run(
      "INSERT OR IGNORE INTO audio_chunks (session_id, seq, file, mime, started_at, received_at) VALUES (?, ?, ?, ?, ?, ?)",
      s.id, q.seq, rel, mime, q.startedAt ?? null, Date.now(),
    );
    const chunk = getOne<AudioChunkRow>("SELECT * FROM audio_chunks WHERE session_id = ? AND seq = ?", s.id, q.seq)!;
    void transcribe(chunk);
    return { ok: true, seq: q.seq, duplicate: false };
  });
}
