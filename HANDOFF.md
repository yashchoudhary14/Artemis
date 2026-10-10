# Handoff

Read this before continuing work on any laptop. Update it at the end of every task, then commit and push.

**Repo:** https://github.com/chhavimittal7489-svg/cline

## Current status
_What works right now, and how it was tested._

- **Phase 0 done (except installing the APK on phones).**
- Server (`server/`, Fastify 5 + tsx, Node 22+): `GET /health` returns `{ok:true}`. Tested locally with `Invoke-RestMethod http://localhost:3000/health` **and** through a cloudflared quick tunnel (`https://<random>.trycloudflare.com/health`) from this laptop. `npm run typecheck` is clean.
- Mobile (`mobile/`, Expo SDK 57, RN 0.86, Expo Router with routes in `mobile/src/app/`): every native module needed for all phases is in the first build: dev-client, location + task-manager (background location + foreground service), expo-audio (background recording), expo-speech-recognition, battery, secure-store, async-storage, react-native-maps (Google), slider, image-picker, file-system. `npx tsc --noEmit` clean, `npx expo-doctor` 21/21.
- EAS project: `@astra-yages/mobile` (id `5c776287-b32b-4b81-9421-02967a77935a`). Android package `com.safewalk.app`. EAS env var `GOOGLE_MAPS_API_KEY` set (development + preview, sensitive).
- **Dev build #2 is IN PROGRESS:** https://expo.dev/accounts/astra-yages/projects/mobile/builds/5045df25-222e-42a7-912d-461c25b335ff
  - Build #1 failed at `npm ci` (ERESOLVE: `react-dom@19.3.0` wanted `react@^19.3.0`). Fixed by pinning `react-dom@19.2.3` (commit `7f93fc7`).
- `data/helplines.json` created from the team's verified table (8 entries, all with source URLs; 1091 excluded).
- Telegram bot, Groq, Expo and Google Maps accounts are set up (key values are in the team's private chat, not in the repo).

## In progress
_Exactly where the last session stopped (file, function, half-done step)._

- Waiting for dev build #2. When it finishes, install the APK on every demo phone (open the build page on the phone and tap Install), open SafeWalk, and confirm the dev-client launcher appears.
- Phase 1 has not started yet.

## Next steps
_In order._

1. Install the dev build APK on the demo phones (see above). If the build errors, check its logs before rebuilding.
2. Phase 1 server: SQLite (`node:sqlite`), sessions, heartbeats, 45 s watchdog, timer expiry, duress, fixed-template alerts, `notify` interface (telegram + console), Telegram contact linking (`/start <code>` → save chat_id).
3. Phase 1 mobile: home, walk/timer, settings (server URL, name, PIN, duress PIN, contacts, escalation wait default 5 min). **Check `UI_reference/` for designs first.**
4. 5-minute speech-recognition spike on each phone (hi-IN / en-IN) as soon as the APK is installed.
5. Phase 2: guardian page, Cline SDK escalation agent, safe zones.

## Decisions (from the kickoff plan)

- Notifier: **Telegram** (Twilio trial can't send custom message bodies). Console notifier for testing.
- Speech-to-text for panic chunks: **Groq** `whisper-large-v3-turbo`; backup Deepgram.
- Agent: Cline SDK `@cline/sdk` 0.0.92, provider `anthropic`. Testing `claude-haiku-5-5`, demo `claude-opus-5-5`.
- Escalation wait: default **300 s**, user can change it in app Settings. For demo step 6, set it to 1 min from Settings.
- Maps: native `react-native-maps` (Google) for smooth safe-zone drawing.
- Demo location: Guwahati, Assam. Medical fast-dial: 108 in Assam, 112 elsewhere.
- UI: designs will be added to `UI_reference/`. Check it (and ask) before building each screen.

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
- **Google Maps key is unrestricted** (hackathon shortcut). Restrict it to the package + SHA-1 after the demo.
- **Telegram limit:** a bot can only message people who have opened the bot and pressed Start once. Every emergency contact must do this during setup; the server must save their chat ID then. Build this into the "add contact" flow and test it with every team phone before the demo.

## Last commit

- Hash: `2f99448` (plus this HANDOFF-only commit on top; run `git log -1` for the exact latest)
- Message: README fresh-laptop setup; server /health verified through cloudflared tunnel; HANDOFF updated
- Pushed by / from which laptop: Yash's laptop (Windows)
- Credits key in use: not recorded
