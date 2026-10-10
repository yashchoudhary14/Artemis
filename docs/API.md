# SafeWalk server API

Base URL: the server (`http://<laptop-ip>:3000` on the same Wi-Fi, or the cloudflared tunnel URL).
JSON in and out. Endpoints marked 🔒 need `Authorization: Bearer <token>` (token from `POST /users`, kept in SecureStore on the phone).

## Account

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/users` | `{ name, escalationWaitSeconds? (60–900) }` | `{ token, ...Me }` |
| GET 🔒 | `/me` | — | `Me` |
| PATCH 🔒 | `/me` | `{ name?, escalationWaitSeconds? }` | `Me` |
| PUT 🔒 | `/me/medical` | `{ bloodGroup?, allergies?, conditions? }` (`""` clears) | `Me` |
| POST 🔒 | `/contacts` | `{ name, tier: "inner" \| "wider" }` | `Contact` (with `linkUrl` = `t.me/<bot>?start=CODE`) |
| DELETE 🔒 | `/contacts/:id` | — | `{ ok }` |

`Me = { id, name, escalationWaitSeconds, contacts: Contact[], medical: { bloodGroup, allergies, conditions }, email, emailVerified, photoUrl }`
`Contact = { id, name, tier, position, linkCode, linkUrl, linked }`

## Sessions (walk, uneasy mode, SOS)

| Method | Path | Body | Returns / effect |
|---|---|---|---|
| POST 🔒 | `/sessions` | `{ kind?: "walk" \| "suspicion", destination?, timerMinutes? (1–240), battery?, state?, inSafeZone, buddyMatchId? }` | `{ sessionId, timerEndsAt, guardianUrl }`. Ends an older *quiet* walk; a session that has alerted keeps running until her real PIN ends it. |
| POST 🔒 | `/sessions/:id/heartbeat` | `{ lat?, lng?, accuracy?, battery?, state?, inSafeZone }` | `{ ok, active }`. Every 15 s (5 s in panic). No location stored while `inSafeZone` (ignored in panic mode). Battery ≤ 10 % sends one `battery_low` alert. |
| POST 🔒 | `/sessions/:id/end` | `{ reason: "cancel" \| "duress" }` | Always `{ ok: true }`. Duress alerts silently and keeps the session watched. |
| POST 🔒 | `/sessions/:id/keyword` | `{ keyword, snippets: string[], lat?, lng?, accuracy?, battery?, state? }` | `{ ok, sessionId, guardianUrl }`. Instant template alert, then AI follow-up. |
| POST 🔒 | `/panic` | `{ sessionId?, lat?, lng?, accuracy?, battery?, state? }` | `{ ok, sessionId, guardianUrl }`. SOS: reuses the running session or opens a `panic` one. Works inside safe zones. A second press does not re-alert. |
| POST 🔒 | `/sessions/:id/audio?seq=N&startedAt=ms` | multipart, one file field (m4a/aac/wav/3gp) | `{ ok, seq, duplicate }`. Same `seq` twice is a no-op. Transcribed with Groq Whisper. |
| GET 🔒 | `/sessions/:id/status` | — | `{ status, kind, alerts, acks, escalation, agent, audioChunks }` for the "Stay with me" screen. A duress session reports `status: "ended"` and no alerts. |

## Help

| Method | Path | Returns |
|---|---|---|
| GET | `/helplines?state=Assam` | `{ state, ambulanceNumber, helplines: [{ number, purpose, coverage, sourceUrl, dateVerified }] }`. National + that state. Entries without a source URL are never returned. |
| GET 🔒 | `/nearby?type=hospital\|police&lat=..&lng=..` | `{ source: "Google Maps", places: [{ name, address, phone, lat, lng, distanceM, mapsUrl }] }` sorted by distance (Places API (New)). |
| POST 🔒 | `/medical` | Body `{ lat?, lng?, accuracy?, battery?, state? }` → `{ ok, sessionId, guardianUrl, ambulanceNumber }`. Notifies the inner circle with the location (template). |

## Guardian link (no login)

| Method | Path | Returns |
|---|---|---|
| GET | `/g/:token` | The guardian page (`server/public/guardian.html`). |
| GET | `/api/guardian/:token` | Name, status, trail, battery, alerts, acks, escalation, agent messages, audio clips (+ transcripts), medical card, buddy. Polled every 3 s. |
| POST | `/api/guardian/:token/ack` | `{ name }` → "I'm on it": stops the escalation ladder and tells the rest of the inner circle. |
| GET | `/api/guardian/:token/audio/:seq` | The audio clip. |

## Walking buddy 🔒

| Method | Path | Body / returns |
|---|---|---|
| GET | `/buddy/areas` | `{ areas }` (campus areas, `server/src/buddy/areas.ts`) |
| GET | `/buddy/me` | `BuddyState = { email, verified, photoUrl, domain, request, match }` |
| POST | `/buddy/email/start` | `{ email }` (must be `@INSTITUTE_EMAIL_DOMAIN`). The 6-digit code is printed in the server log (allowed shortcut). |
| POST | `/buddy/email/verify` | `{ email, code }` → `BuddyState` |
| POST | `/buddy/photo` | multipart image → `BuddyState` (photo served at `/photos/<random token>`) |
| GET | `/buddy/departures` | `{ departures: [{ id, name (first name), startArea, destArea, departAt }] }` |
| POST | `/buddy/requests` | `{ startArea, destArea, departAt }` → `BuddyState` (auto-matches same route within ±15 min) |
| DELETE | `/buddy/requests` | cancel my open request |
| POST | `/buddy/matches/:id/accept` · `/decline` | Both accept → each family gets the buddy's name, verified email and photo link. |

## Alerts and the agent

- First alerts are fixed templates (`server/src/alerts.ts`): `timer`, `duress`, `lost_contact`, `keyword`, `panic`, `medical`, `battery_low`. Inner circle gets the live link; wider circle gets location only.
- `timer`, `duress`, `lost_contact`, `keyword`, `panic` start the escalation ladder (`server/agent/escalation.ts`): contact 1 → wait `escalationWaitSeconds` → contact 2 → … → "call 112". The Cline SDK agent writes each message and may raise the level (3 = tell everyone to call 112 now); it can never lower or stop it. It stops only on "I'm on it" or a real-PIN end. If the agent fails or takes longer than `AGENT_TIMEOUT_SECONDS`, a template is sent instead.
- Agent tools: `get_session_context`, `send_notification` (rejects any phone number not from helplines/Places), `check_acknowledgements`, `find_nearby`, `get_helplines`, `get_transcripts`, `raise_alert_level`.
