// Generates assets/sounds/siren.wav: a loud, attention-grabbing two-tone siren that loops cleanly.
//   node scripts/make-siren.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const SECONDS = 2; // 0.5 s high, 0.5 s low, twice → seamless loop
const n = RATE * SECONDS;
const data = Buffer.alloc(n * 2);

let phase = 0;
for (let i = 0; i < n; i++) {
  const t = i / RATE;
  const high = Math.floor(t / 0.5) % 2 === 0;
  // Slight upward sweep inside each half for a "wailing" feel.
  const within = (t % 0.5) / 0.5;
  const freq = high ? 1050 + 120 * within : 760 + 90 * within;
  phase += (2 * Math.PI * freq) / RATE;
  // Square-ish tone (sine + odd harmonics) is perceived much louder than a pure sine.
  const s = Math.sin(phase) + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5;
  // 4 ms fade at each tone change to avoid clicks.
  const edge = Math.min(t % 0.5, 0.5 - (t % 0.5));
  const fade = Math.min(1, edge / 0.004);
  const v = Math.max(-1, Math.min(1, (s / 1.25) * fade * 0.97));
  data.writeInt16LE(Math.round(v * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds", "siren.wav");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out} (${(header.length + data.length) / 1024} KB)`);
