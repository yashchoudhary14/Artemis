# Handoff

Read this before continuing work on any laptop. Update it at the end of every task, then commit and push.

**Repo:** https://github.com/chhavimittal7489-svg/cline

## Current status
_What works right now, and how it was tested._

- **Phase 0 done (except installing the APK on phones).**
- Server (`server/`, Fastify 5 + tsx, Node 22+): `GET /health` returns `{ok:true}`. Tested locally with `Invoke-RestMethod http://localhost:3000/health` **and** through a cloudflared quick tunnel (`https://<random>.trycloudflare.com/health`) from this laptop. `npm run typecheck` is clean.
- Mobile (`mobile/`, Expo SDK 57, RN 0.86, Expo Router with routes in `mobile/src/app/`): every native module needed for all phases is in the first build: dev-client, location + task-manager (background location + foreground service), expo-audio (background recording), expo-speech-recognition, battery, secure-store, async-storage, react-native-maps (Google), slider, image-picker, file-system. `npx tsc --noEmit` clean, `npx expo-doctor` 21/21.
- EAS project: `@astra-yages/mobile` (id `5c776287-b32b-4b81-9421-02967a77935a`). Android package `com.safewalk.app`. EAS env var `GOOGLE_MAPS_API_KEY` set (development + preview, sensitive).
- **Dev build #2 FINISHED.** APK: https://expo.dev/artifacts/eas/kf7f558I2teZ6wesg_W6sIlb1z9UU6nZBNpa6DjUPVU.apk (build page: https://expo.dev/accounts/astra-yages/projects/mobile/builds/5045df25-222e-42a7-912d-461c25b335ff). **Not yet installed on any phone.**
- **Phase 1 SERVER done.** Tested with `npm run smoke` (20/20 PASS, console notifier, `HEARTBEAT_TIMEOUT_SECONDS=10`), and the alert texts were read in the server log:
  - SQLite via `node:sqlite` at `server/data/safewalk.db`. Tables: users, contacts, sessions, locations, alerts, acks (acks is empty until Phase 2).
  - API (all except `POST /users` need `Authorization: Bearer <token>`):
    - `POST /users {name, escalationWaitSeconds?}` → `{token, id, name, escalationWaitSeconds, contacts}`
    - `GET /me`, `PATCH /me {name?, escalationWaitSeconds? (60–900)}`
    - `POST /contacts {name, tier: inner|wider}` → `{id, linkCode, linkUrl (t.me/<bot>?start=CODE), linked}`, `DELETE /contacts/:id`
    - `POST /sessions {destination?, timerMinutes?, battery?, inSafeZone}` → `{sessionId, timerEndsAt, guardianUrl}`
    - `POST /sessions/:id/heartbeat {lat?, lng?, accuracy?, battery?, inSafeZone}`. No location is stored while `inSafeZone`.
    - `POST /sessions/:id/end {reason: cancel|duress}` always returns `{ok:true}` (duress is indistinguishable). The phone checks the PIN locally.
  - Watchdog every 5 s: fires a timer-expiry alert once, and fires the dead man's switch once after 45 s with no heartbeat (skipped inside a safe zone). The next heartbeat sends "sending updates again".
  - Duress: alerts instantly, and the session stays watched (status `duress`). A later normal cancel cannot end it.
  - Alerts are fixed templates in `server/src/alerts.ts` (no AI). The inner circle gets the live link; the wider circle gets the location only. Times are in IST.
  - `notify` interface: `server/src/notify/` (telegram + console). Never throws; failures are logged with the full text.
  - Telegram linking: `server/src/telegramLink.ts` long-polls `getUpdates` and saves `chat_id` on `/start CODE`. **Not yet tested with the real bot** (needs `server/.env`).
- `data/helplines.json` created from the team's verified table (8 entries, all with source URLs; 1091 excluded).
- Telegram bot, Groq, Expo and Google Maps accounts are set up (key values are in the team's private chat, not in the repo).

## In progress
_Exactly where the last session stopped (file, function, half-done step)._

- Phase 1 mobile has not started. UI direction is decided (see Decisions): Artemis layout with the light pink/lilac palette.
- APK is built but not yet installed on phones.

## Next steps
_In order._

1. Install the APK (link above) on every demo phone, open SafeWalk, and confirm the dev-client launcher appears.
2. Fill `server/.env` (needs `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`). Test Telegram linking: create a contact, open its `linkUrl` on a phone, press Start, and check `GET /me` shows `linked: true`.
3. Phase 1 mobile: home, walk/timer, settings (server URL, name, PIN, duress PIN, contacts with Telegram link share, escalation-wait slider 1–15 min). Then `api.ts`, a 15 s heartbeat with location and battery, and PINs in SecureStore. Duress must show the same "Walk cancelled" screen.
4. 5-minute speech-recognition spike on each phone (hi-IN / en-IN).
5. Phase 2: guardian page (`/g/:token`; the route doesn't exist yet, so links currently 404), Cline SDK escalation agent, safe zones.

## Decisions (from the kickoff plan)

- Notifier: **Telegram** (Twilio trial can't send custom message bodies). Console notifier for testing.
- Speech-to-text for panic chunks: **Groq** `whisper-large-v3-turbo`; backup Deepgram.
- Agent: Cline SDK `@cline/sdk` 0.0.92, provider `anthropic`. Testing `claude-haiku-5-5`, demo `claude-opus-5-5`.
- Escalation wait: default **300 s**, user can change it in app Settings. For demo step 6, set it to 1 min from Settings.
- Maps: native `react-native-maps` (Google) for smooth safe-zone drawing.
- Demo location: Guwahati, Assam. Medical fast-dial: 108 in Assam, 112 elsewhere.
- UI: **hybrid**. Take the layout and screens from `UI_reference/general app UI/design 2` (Artemis: Home with "Start a walk" / "I feel uneasy" / circle avatars / centre SOS tab, Private zones with radius slider, "Stay with me" with alert timeline), and use the **light pink/lilac palette** from `design 1` (soft gradients, serif headlines, white frosted cards, dark pill buttons). Maps follow the Life360 references (`maps reference/`); the buddy screen follows the radar reference (`find a buddy/`). The `.mp4` files couldn't be viewed by the agent.

## How to run

- See `README.md` (fresh-laptop setup, server, tunnel, phone).

## Environment variables needed
_Name, what it is, where to get it. Real values are never written here or committed._

| Variable | What it is | Where to get it | Set up? |
|---|---|---|---|
| `PORT` | Server port (default 3000) | — | Default |
| `PUBLIC_BASE_URL` | Tunnel URL used in guardian links | Output of `npm run tunnel` (changes each restart) | Per session |
| `ANTHROPIC_API_KEY` | Agent LLM key | Team private chat | Needed for Phase 2 |
| `AGENT_PROVIDER` | Cline SDK provider id (`anthropic`) | — | Default |
| `AGENT_MODEL` | `claude-haiku-5-5` for testing, `claude-opus-5-5` for demo | Set by team | Default |
| `NOTIFY_PROVIDER` | `telegram` or `console` | — | Default |
| `TELEGRAM_BOT_TOKEN` | Sends alert messages to contacts (main demo channel) | Team private chat (created via @BotFather) | Yes |
| `TELEGRAM_BOT_USERNAME` | Bot username without @, used for contact link | @BotFather | Needed for Phase 1 |
| `GROQ_API_KEY` | Speech-to-text (Whisper) for panic-mode audio chunks | Team private chat (console.groq.com) | Yes |
| `GOOGLE_MAPS_API_KEY` | Places API (server) + Maps SDK for Android (EAS env var) | Team private chat (Google Cloud console) | Yes (also set on EAS) |
| `HEARTBEAT_TIMEOUT_SECONDS` | Dead man's switch timeout (45) | — | Default |
| `ESCALATION_WAIT_SECONDS` | Default escalation wait (300) | — | Default |
| `INSTITUTE_EMAIL_DOMAIN` | Allowed domain for buddy sign-up | Team decides | Needed for Phase 4 |

## Accounts and keys status
| Service | Status |
|---|---|
| GitHub repo | Created |
| Telegram bot | Created |
| Groq (speech-to-text) | Key obtained |
| Expo account (dev build) | Created |
| Google Places / Maps | Created |
| Twilio (optional) | Not yet |

## Helplines (verified by team on 10 Oct 2026)

Use these to build `data/helplines.json`. Fields: number, purpose, coverage, source URL, date verified (2026-10-10).

| Number | Purpose (shown to user) | Coverage | Source |
|---|---|---|---|
| 112 | Single emergency number: police, fire, ambulance | National | https://www.india.gov.in/directory/helpline |
| 100 | Police | National | https://www.india.gov.in/directory/helpline |
| 102 | Ambulance | National | https://www.india.gov.in/directory/helpline |
| 101 | Fire | National | https://www.india.gov.in/directory/helpline |
| 139 | Railway security and medical help on trains | National | https://www.india.gov.in/directory/helpline |
| 14490 | National Commission for Women helpline, 24/7 | National | https://www.digitalindia.gov.in/initiative/ncw-womens-helpline/ |
| 108 | Ambulance (Mrityunjoy 108) | Assam | https://nhm.assam.gov.in/schemes/mrityunjoy-%E2%80%93-108 |
| 181 | Sakhi women helpline | Assam | https://assam.mygov.in/en/talk/181-sakhi-women-helpline-number-launched/ |

- Extra reference page for Assam district helplines (no numbers taken from it yet): https://kamrup.assam.gov.in/all-helplines-numbers
- **1091 (women helpline) has no source yet.** Leave it out of the JSON until the team adds an official source.
- Medical fast-dial in Assam should dial **108**. Outside states covered in the file, fall back to **112**.

## Known issues and workarounds

- **npm 11 blocks install scripts.** After `npm ci` in `server/`, run `node node_modules\cloudflared\lib\cloudflared.js bin install` once to get the tunnel binary (see README).
- **EAS uses npm 10 with `npm ci`.** Peer conflicts that npm 11 tolerates locally can fail there. Before a new build, check with `npx npm@10 install --package-lock-only --include=dev` in `mobile/`.
- **Only one server may poll the Telegram bot at a time** (409 Conflict). A second laptop should use `NOTIFY_PROVIDER=console` with an empty token.
- **Guardian links (`/g/...`) 404 until Phase 2** builds the page.
- **Google Maps key is unrestricted** (hackathon shortcut). Restrict it to the package + SHA-1 after the demo.
- **Telegram limit:** a bot can only message people who have opened the bot and pressed Start once. Every emergency contact must do this during setup; the server must save their chat ID then. Build this into the "add contact" flow and test it with every team phone before the demo.

## Last commit

- Hash: `2f99448` (plus this HANDOFF-only commit on top; run `git log -1` for the exact latest)
- Message: README fresh-laptop setup; server /health verified through cloudflared tunnel; HANDOFF updated
- Pushed by / from which laptop: Yash's laptop (Windows)
- Credits key in use: not recorded
