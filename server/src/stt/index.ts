import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

// One small interface so the speech-to-text provider can be swapped (backup: Deepgram).
export interface SpeechToText {
  transcribe(filePath: string, mime: string): Promise<string>;
}

// Groq Whisper (whisper-large-v3-turbo). Language is auto-detected (Hindi/English mix).
const groq: SpeechToText = {
  async transcribe(filePath, mime) {
    if (!config.groqApiKey) throw new Error("GROQ_API_KEY is not set");
    const form = new FormData();
    form.append("file", new Blob([await readFile(filePath)], { type: mime }), path.basename(filePath));
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "json");
    form.append("temperature", "0");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${config.groqApiKey}` },
      body: form,
    });
    const body = (await res.json()) as { text?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(`Groq: ${body.error?.message ?? res.status}`);
    return (body.text ?? "").trim();
  },
};

export const stt: SpeechToText = groq;
