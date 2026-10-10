// Phase 1 end-to-end check against a running server (see README "Testing the server").
// Start the server with a short timeout and the console notifier first (PowerShell):
//   $env:NOTIFY_PROVIDER='console'; $env:HEARTBEAT_TIMEOUT_SECONDS='10'; npm start
// then in another terminal: npm run smoke   (takes ~75 s; shortest walk timer is 1 minute)
import { alertsFor, call, check, failures, heartbeat, locationCount, newUser, sessionRow, sleep } from "./smoke-helpers.js";

async function main() {
  check("health", (await call("GET", "/health")).body.ok === true);

  const priya = await call("POST", "/users", undefined, { name: "Priya", escalationWaitSeconds: 60 });
  check("create user returns token", typeof priya.body.token === "string", priya.body);
  check("bad escalation wait rejected", (await call("POST", "/users", undefined, { name: "X", escalationWaitSeconds: 5 })).status === 400);
  check("no token -> 401", (await call("GET", "/me")).status === 401);
  const c = await call("POST", "/contacts", priya.body.token, { name: "Mum" });
  check("contact gets 6-char link code", /^[A-Z2-9]{6}$/.test(c.body.linkCode), c.body);
  check("/me lists the contact", (await call("GET", "/me", priya.body.token)).body.contacts.length === 1);

  // A: 1-min timer walk with steady heartbeats -> timer alert only.
  const ta = await newUser("Timer Tester");
  const a = (await call("POST", "/sessions", ta, { destination: "Library", timerMinutes: 1, battery: 70 })).body;
  check("start walk returns guardian URL", String(a.guardianUrl).includes("/g/"), a);

  // B: heartbeats stop -> dead man's switch.
  const tb = await newUser("Lost Tester");
  const b = (await call("POST", "/sessions", tb, {})).body;
  await heartbeat(tb, b.sessionId);

  // C: duress PIN -> same reply as cancel, instant alert, still watched.
  const tc = await newUser("Duress Tester");
  const cs = (await call("POST", "/sessions", tc, { destination: "Hostel" })).body;
  await heartbeat(tc, cs.sessionId);
  const duress = await call("POST", `/sessions/${cs.sessionId}/end`, tc, { reason: "duress" });
  check("duress reply identical to cancel", JSON.stringify(duress.body) === JSON.stringify({ ok: true }), duress.body);
  check("duress alert sent instantly", alertsFor(cs.sessionId).some((x) => x.type === "duress"), alertsFor(cs.sessionId));
  await call("POST", `/sessions/${cs.sessionId}/end`, tc, { reason: "cancel" });
  check("normal cancel can't end a duress session", sessionRow(cs.sessionId).status === "duress");

  // D: inside a safe zone -> no location stored, no dead man's switch.
  const td = await newUser("Zone Tester");
  const d = (await call("POST", "/sessions", td, { inSafeZone: true })).body;
  await heartbeat(td, d.sessionId, { inSafeZone: true });
  check("safe-zone heartbeat stores no location", locationCount(d.sessionId) === 0);

  // E: normal cancel -> ended, never alerts.
  const te = await newUser("Cancel Tester");
  const e = (await call("POST", "/sessions", te, { timerMinutes: 1 })).body;
  const cancel = await call("POST", `/sessions/${e.sessionId}/end`, te, { reason: "cancel" });
  check("cancel ends walk", sessionRow(e.sessionId).status === "ended" && cancel.body.ok === true);

  console.log("...waiting ~70 s for timer and dead man's switch (walk A keeps sending heartbeats)");
  for (let i = 0; i < 14; i++) {
    await heartbeat(ta, a.sessionId);
    await sleep(5000);
  }

  const aAlerts = alertsFor(a.sessionId);
  check("timer expiry alert fired once", aAlerts.filter((x) => x.type === "timer").length === 1, aAlerts);
  check("no false lost-contact while heartbeats flow", !aAlerts.some((x) => x.type === "lost_contact"), aAlerts);
  check("timer alert: calm wording, battery, link", /walk timer to Library ran out.*Battery 64%.*Live link: http/.test(aAlerts[0]?.message ?? ""), aAlerts[0]);
  const bAlerts = alertsFor(b.sessionId);
  check("dead man's switch fired once", bAlerts.filter((x) => x.type === "lost_contact").length === 1, bAlerts);
  check("lost-contact message has last location", /Lost contact with Lost Tester.*maps\.google\.com/.test(bAlerts[0]?.message ?? ""), bAlerts[0]);
  check("no dead man's switch inside safe zone", alertsFor(d.sessionId).length === 0, alertsFor(d.sessionId));
  check("cancelled walk never alerted", alertsFor(e.sessionId).length === 0, alertsFor(e.sessionId));

  await heartbeat(tb, b.sessionId);
  check("heartbeat after lost contact clears flag", sessionRow(b.sessionId).lost_contact === 0);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll Phase 1 checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
