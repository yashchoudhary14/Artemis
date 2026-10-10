// Phase 2–4 end-to-end check against a running server (console notifier).
// Terminal 1 (PowerShell):
//   $env:NOTIFY_PROVIDER='console'; $env:AGENT_MODEL='anthropic/claude-haiku-5.5'; npm start
// Terminal 2:  npm run smoke:all     (takes ~2 min; uses the agent, Groq and Google Places if keys are set)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, call, check, db, failures, heartbeat, sleep } from "./smoke-helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const IITG = { lat: 26.1878, lng: 91.6916 };

async function waitFor<T>(label: string, fn: () => T | undefined | false, timeoutMs: number): Promise<T | undefined> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(1000);
  }
  console.log(`  (gave up waiting for ${label} after ${timeoutMs / 1000}s)`);
  return undefined;
}

const agentEvents = (sessionId: string) =>
  db.prepare("SELECT kind, text, recipient FROM agent_events WHERE session_id = ? ORDER BY id").all(sessionId) as {
    kind: string;
    text: string;
    recipient: string | null;
  }[];
const escalation = (sessionId: string) => db.prepare("SELECT * FROM escalations WHERE session_id = ?").get(sessionId) as any;
const alertTypes = (sessionId: string) =>
  (db.prepare("SELECT type FROM alerts WHERE session_id = ? ORDER BY created_at").all(sessionId) as { type: string }[]).map((a) => a.type);
const fastForward = (sessionId: string) => db.prepare("UPDATE escalations SET next_at = 0 WHERE session_id = ?").run(sessionId);

// Spoken test audio made with Windows text-to-speech (never a real recording; *.wav is gitignored).
function testWav(): string {
  const file = path.join(here, "fixtures", "help-test.wav");
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('${file}'); $s.Speak('Help me please. Someone is following me near the library. I am scared.'); $s.Dispose()`,
    ]);
  }
  return file;
}

async function upload(token: string, sessionId: string, seq: number, file: string) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(file)], { type: "audio/wav" }), "chunk.wav");
  const res = await fetch(`${BASE}/sessions/${sessionId}/audio?seq=${seq}&startedAt=${Date.now()}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function userWithContacts(name: string) {
  const u = (await call("POST", "/users", undefined, { name, escalationWaitSeconds: 60 })).body;
  await call("POST", "/contacts", u.token, { name: "Mum" });
  await call("POST", "/contacts", u.token, { name: "Dad" });
  await call("POST", "/contacts", u.token, { name: "Riya", tier: "wider" });
  return u.token as string;
}

async function main() {
  // --- Helplines (only sourced entries) ---
  const assam = (await call("GET", "/helplines?state=Assam")).body;
  const nums = assam.helplines.map((h: any) => h.number);
  check("helplines: Assam has 108 + 181 + national 112", ["108", "181", "112"].every((n) => nums.includes(n)), nums);
  check("helplines: no unsourced 1091", !nums.includes("1091"));
  check("helplines: Assam ambulance is 108", assam.ambulanceNumber === "108");
  check("helplines: elsewhere ambulance is 112", (await call("GET", "/helplines?state=Kerala")).body.ambulanceNumber === "112");

  const priya = await userWithContacts("Priya");

  // --- Medical card ---
  const med = await call("PUT", "/me/medical", priya, { bloodGroup: "B+", allergies: "Penicillin", conditions: "Asthma" });
  check("medical card saved", med.body.medical?.bloodGroup === "B+", med.body);

  // --- Nearby (Google Places) ---
  const near = await call("GET", `/nearby?type=police&lat=${IITG.lat}&lng=${IITG.lng}`, priya);
  check("nearby police from Google Places", near.status === 200 && near.body.places.length > 0 && near.body.source === "Google Maps", near.body);
  if (near.body.places?.length > 1) check("nearby sorted by distance", near.body.places[0].distanceM <= near.body.places[1].distanceM);

  // --- Suspicion mode -> keyword -> instant alert + AI follow-up ---
  const walk = (await call("POST", "/sessions", priya, { kind: "suspicion", state: "Assam" })).body;
  await heartbeat(priya, walk.sessionId, { ...IITG, battery: 55 });
  const token = String(walk.guardianUrl).split("/g/")[1];
  check("guardian JSON for valid link", (await call("GET", `/api/guardian/${token}`)).status === 200);
  check("guardian JSON 404 for bad link", (await call("GET", "/api/guardian/nope")).status === 404);
  check("guardian page served", (await fetch(`${BASE}/g/${token}`)).status === 200);

  const t0 = Date.now();
  const kw = await call("POST", `/sessions/${walk.sessionId}/keyword`, priya, {
    keyword: "bachao",
    snippets: ["leave me alone", "bachao"],
    ...IITG,
    battery: 54,
  });
  check("keyword reply ok, same session", kw.body.ok && kw.body.sessionId === walk.sessionId, kw.body);
  check("keyword template alert within 10 s", alertTypes(walk.sessionId).includes("keyword") && Date.now() - t0 < 10_000);
  const followUp = await waitFor(
    "AI follow-up",
    () => {
      const ev = agentEvents(walk.sessionId).filter((e) => e.kind === "message" || e.kind === "fallback");
      const to = new Set(ev.flatMap((e) => (e.recipient ?? "").split(", ")));
      return to.has("Mum") && to.has("Dad") ? ev : undefined;
    },
    60_000,
  );
  check("AI follow-up to both inner contacts within 60 s", Boolean(followUp), agentEvents(walk.sessionId));
  console.log(`  follow-up took ${Math.round((Date.now() - t0) / 1000)} s; kinds: ${[...new Set(agentEvents(walk.sessionId).map((e) => e.kind))].join(", ")}`);
  const sample = followUp?.find((e) => e.kind === "message");
  if (sample) console.log(`  sample AI message: ${sample.text}`);

  // --- Panic audio: upload, idempotent retry, transcription, AI summary ---
  const wav = testWav();
  const up1 = await upload(priya, walk.sessionId, 0, wav);
  const up2 = await upload(priya, walk.sessionId, 0, wav);
  check("audio chunk accepted", up1.status === 200 && up1.body.duplicate === false, up1);
  check("same chunk again is a no-op", up2.status === 200 && up2.body.duplicate === true, up2);
  const transcript = await waitFor(
    "transcript",
    () => (db.prepare("SELECT transcript FROM audio_chunks WHERE session_id = ? AND seq = 0").get(walk.sessionId) as any)?.transcript as string,
    30_000,
  );
  check("Groq transcript of chunk", /help|follow|library/i.test(transcript ?? ""), transcript);
  const summary = await waitFor("AI summary", () => agentEvents(walk.sessionId).find((e) => e.kind === "summary"), 90_000);
  check("AI summary of transcripts sent", Boolean(summary));
  const g = (await call("GET", `/api/guardian/${token}`)).body;
  check("guardian shows audio + medical + AI label", g.audio.length === 1 && g.medical.bloodGroup === "B+" && /may contain errors/.test(g.aiLabel), g.audio);
  const audioRes = await fetch(`${BASE}${g.audio[0].url}`);
  check("guardian audio clip plays (served)", audioRes.status === 200 && (audioRes.headers.get("content-type") ?? "").startsWith("audio/"));

  // --- "I'm on it" stops escalation and tells the others ---
  const ack = await call("POST", `/api/guardian/${token}/ack`, undefined, { name: "Mum" });
  check("ack accepted", ack.body.ok === true);
  check("escalation stopped by ack", escalation(walk.sessionId)?.done === 1, escalation(walk.sessionId));

  // --- Escalation ladder (duress): contact 1 -> contact 2 -> call 112 ---
  const asha = await userWithContacts("Asha");
  const w2 = (await call("POST", "/sessions", asha, { destination: "Hostel", state: "Assam" })).body;
  await heartbeat(asha, w2.sessionId, IITG);
  const duress = await call("POST", `/sessions/${w2.sessionId}/end`, asha, { reason: "duress" });
  check("duress reply looks like cancel", JSON.stringify(duress.body) === JSON.stringify({ ok: true }));
  const status = (await call("GET", `/sessions/${w2.sessionId}/status`, asha)).body;
  check("phone status hides duress (shows ended, no alerts)", status.status === "ended" && status.alerts.length === 0, status);
  const step1 = await waitFor("escalation step 1", () => (escalation(w2.sessionId)?.step >= 1 ? escalation(w2.sessionId) : undefined), 60_000);
  check("step 1 messaged contact 1 (Mum)", Boolean(step1) && agentEvents(w2.sessionId).some((e) => e.recipient === "Mum"), agentEvents(w2.sessionId));
  // Keep the duress phone "alive" so the dead man's switch doesn't add noise.
  await heartbeat(asha, w2.sessionId, IITG);
  fastForward(w2.sessionId);
  const step2 = await waitFor("escalation step 2", () => {
    const e = escalation(w2.sessionId);
    return e?.step >= 2 || e?.done ? e : undefined;
  }, 60_000);
  // Either the ladder moved on to Dad, or the agent judged it urgent (level 3) and everyone was told to call 112.
  check(
    "step 2 reached contact 2 (Dad)",
    Boolean(step2) && agentEvents(w2.sessionId).some((e) => (e.recipient ?? "").split(", ").includes("Dad")),
    agentEvents(w2.sessionId),
  );
  const lvl = escalation(w2.sessionId);
  console.log(`  escalation after 2 steps: step=${lvl?.step} level=${lvl?.level} done=${lvl?.done} reason=${lvl?.done_reason ?? ""}`);
  if (!lvl?.done) {
    fastForward(w2.sessionId);
    await waitFor("112 step", () => (escalation(w2.sessionId)?.done ? true : undefined), 30_000);
  }
  check("ladder ends by telling everyone to call 112", /112/.test(escalation(w2.sessionId)?.done_reason ?? ""), escalation(w2.sessionId));
  const level = escalation(w2.sessionId)?.level ?? 0;
  check("level never below start (duress starts at 2)", level >= 2, level);

  // --- SOS without a walk, battery low, medical fast-dial ---
  const sos = (await call("POST", "/panic", priya, { ...IITG, battery: 40, state: "Assam" })).body;
  check("SOS creates a panic session with an alert", sos.ok && alertTypes(sos.sessionId).includes("panic"), sos);
  const sos2 = (await call("POST", "/panic", priya, { sessionId: sos.sessionId, ...IITG })).body;
  check("second SOS press does not re-alert", sos2.sessionId === sos.sessionId && alertTypes(sos.sessionId).filter((t) => t === "panic").length === 1);
  const b = (await call("POST", "/sessions", priya, { destination: "Library" })).body;
  await heartbeat(priya, b.sessionId, { ...IITG, battery: 9 });
  await heartbeat(priya, b.sessionId, { ...IITG, battery: 8 });
  check("battery <= 10% alerts exactly once", alertTypes(b.sessionId).filter((t) => t === "battery_low").length === 1, alertTypes(b.sessionId));
  const medical = (await call("POST", "/medical", priya, { ...IITG, battery: 30, state: "Assam" })).body;
  check("medical fast-dial: 108 + alert", medical.ambulanceNumber === "108" && alertTypes(medical.sessionId).includes("medical"), medical);

  // --- Walking buddy ---
  const ananya = await userWithContacts("Ananya");
  const bad = await call("POST", "/buddy/email/start", priya, { email: "priya@gmail.com" });
  check("buddy: non-institute email rejected", bad.status === 400, bad.body);
  const domain = (await call("GET", "/buddy/me", priya)).body.domain || "iitg.ac.in";
  const codeHash = createHash("sha256").update("123456").digest("hex");
  for (const [t, email] of [[priya, `priya@${domain}`], [ananya, `ananya@${domain}`]] as const) {
    await call("POST", "/buddy/email/start", t, { email });
    db.prepare("UPDATE email_codes SET code_hash = ? WHERE email = ?").run(codeHash, email); // the real code is only in the server log
    const wrong = await call("POST", "/buddy/email/verify", t, { email, code: "000000" });
    const v = await call("POST", "/buddy/email/verify", t, { email, code: "123456" });
    check(`buddy: ${email} wrong code rejected, right code verifies`, wrong.status === 400 && v.body.verified === true, v.body);
  }
  const at = Date.now() + 20 * 60_000;
  await call("POST", "/buddy/requests", priya, { startArea: "Library", destArea: "Main Gate", departAt: at });
  const deps = (await call("GET", "/buddy/departures", ananya)).body.departures;
  check("buddy: Priya's walk listed in departures", deps.some((d: any) => d.name === "Priya" && d.startArea === "Library"), deps);
  const r2 = (await call("POST", "/buddy/requests", ananya, { startArea: "Library", destArea: "Main Gate", departAt: at + 10 * 60_000 })).body;
  check("buddy: matched within ±15 min", r2.match?.buddy?.name === "Priya", r2);
  const a1 = (await call("POST", `/buddy/matches/${r2.match.id}/accept`, ananya)).body;
  check("buddy: one accept is not enough", a1.match.status === "proposed");
  const a2 = (await call("POST", `/buddy/matches/${r2.match.id}/accept`, priya)).body;
  check("buddy: both accept -> accepted", a2.match.status === "accepted" && a2.match.buddy.name === "Ananya", a2);
  const bw = (await call("POST", "/sessions", priya, { destination: "Main Gate", buddyMatchId: r2.match.id })).body;
  const bg = (await call("GET", `/api/guardian/${String(bw.guardianUrl).split("/g/")[1]}`)).body;
  check("guardian shows the buddy", bg.buddy?.name === "Ananya", bg.buddy);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll Phase 2–4 checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
