# Handoff

Read this before continuing work on any laptop. Update it at the end of every task, then commit and push.

**Repo:** https://github.com/yashchoudhary14/safewalk (private). The original team repo `chhavimittal7489-svg/cline` is kept as the git remote `team` in this copy; nothing is pushed there.

## Current status
_What works right now, and how it was tested._

- **All phases (0–4) are built.** Server is tested end to end; the phone app typechecks and bundles but has **not yet been run on a phone**.
- **Server** (`server/`, Fastify 5 + tsx, Node 22+, SQLite via `node:sqlite`):
  - Phase 1: walks, timer expiry, duress PIN, 45 s dead man's switch, fixed-template alerts, Telegram/console notifier, Telegram contact linking.
  - Phase 2: **Cline SDK escalation agent** (`server/agent/`): ladder contact 1 → wait → contact 2 → … → "call 112", driven by the watchdog; agent drafts messages, can only raise the level, template fallback on error/timeout; stops on "I'm on it" or real-PIN end. Guardian page `/g/:token` (Leaflet map + trail, I'm on it, audio + transcripts, AI summary labelled, medical card, timeline, agent log).
  - Phase 3: keyword endpoint (instant template alert + AI follow-up with nearest police), SOS `/panic`, 10 s audio chunk upload (idempotent by seq), Groq `whisper-large-v3-turbo` transcription, AI summaries of transcripts, battery ≤ 10 % alert.
  - Phase 4: `/helplines` (from `data/helplines.json`, sourced entries only), `/nearby` (Google Places API (New), sorted by distance, "Source: Google Maps"), medical card, `/medical` fast-dial notify (108 in Assam, else 112), walking buddy (institute email code in server log, photo, campus areas, ±15 min match, both-accept announcement to families).
  - **Tested:** `npm run typecheck` clean; `npm run smoke` 20/20; `npm run smoke:all` 39/39 (real Cline agent with Haiku, real Groq, real Google Places, console notifier). Guardian page checked in a browser at phone size.
- **Mobile** (`mobile/`, Expo SDK 57, RN 0.86, Expo Router, routes in `mobile/src/app/`): tabs Home / Walk / SOS / Help / Rise in the Artemis layout with the pink/lilac palette; Rise = settings (server URL, account, PIN + duress PIN in SecureStore, contacts + Telegram link share, escalation slider, medical card); Walk (timer, PIN pad, duress shows the same "Walk cancelled"); background heartbeat via expo-location task + foreground service (`lib/tracking.ts`); Private zones map (on-device only, `lib/zones.ts`); "I feel uneasy" (expo-speech-recognition, hi-IN/en-IN, 30 min auto-off, paused in zones); SOS (hold 1 s, 10 s audio chunks via expo-audio, offline queue, "Stay with me" timeline); Help (medical fast-dial, address in large text, nearby, helplines); Walk together (buddy).
  - **Tested:** `npx tsc --noEmit` clean; `npx expo export --platform android` bundles (3.1 MB). **Not run on a device yet.**
- **Dev build #3 FINISHED** (adds `react-native-volume-manager` for the full-volume SOS siren). APK: https://expo.dev/artifacts/eas/7MnCcsZrWP5mCZw-O0OjiVuzw1QL9TV-LlW-vKa1zQ0.apk (build page: https://expo.dev/accounts/astra-yages/projects/mobile/builds/e50ce4a4-31f5-4af1-80f6-33f4021113a5). Install it on the demo phones. Build #2 still runs everything except forcing the volume to max.
- EAS project: `@astra-yages/mobile` (id `5c776287-b32b-4b81-9421-02967a77935a`). Android package `com.safewalk.app`. Dev build #2 APK: https://expo.dev/artifacts/eas/kf7f558I2teZ6wesg_W6sIlb1z9UU6nZBNpa6DjUPVU.apk

- **Artemis redesign + 2 new Cline features (10 Oct, later):** app renamed Artemis. Light "Artemis" design system (warm off-white, faint blush, black pill CTAs, Instrument Serif display, Geist UI, Marcellus wordmark, crescent mark). Floating tab bar Home · Walk · SOS (raised, centre) · Map · Help; Rise reached from Home. New screens: Map tab (opens wide, camera flies to your location), welcome splash, incident report. Home shows all features as tiles. New server endpoints (read-only Cline agent + plain-code fallback): `POST /briefing` (3 walk tips from time/sunset + Google Places) and `GET /sessions/:id/report` (incident report from session record + transcripts). Tested: server tsc clean, both endpoints answered (fallback path, no keys in the test box); mobile tsc clean, Android bundle exports. Not yet on a phone. Fonts are JS-only packages (no new native build needed).
- **Merged `main-otbdmz` into `main` (10 Oct, evening).** Fixes on top: `server/agent/safety.ts` no longer treats numbers followed by a unit (`m`, `km`, `min`, `hrs`, `secs`) as unverified phone numbers (this was pushing `/briefing` onto the fallback every time); briefing fallback shows distances under 1 km in metres. Tested: mobile + server `tsc` clean; on the live server `/briefing` and `/sessions/:id/report` returned `byAi: true` (before the credits ran out), report gives 401 without a token. `npm run smoke:ci`: 51/52 pass. The one failure ("AI summary of transcripts") is because **Cline credits ran out**, not a code bug.

## In progress
_Exactly where the last session stopped._

- On-device testing of the app has not started. Expect small fixes (permissions flow, background behaviour, layout on small screens).
- **Cline credits balance is $0** (server log: "Insufficient balance"). Every AI step now uses the template / plain-code fallback. Top up at app.cline.bot before the demo, then rerun `npm run smoke:ci` with the demo server stopped.
- Live demo tunnel this session: `https://prevent-judge-aurora-license.trycloudflare.com` (changes on every restart; `demo.ps1` rewrites `server/.env` and `mobile/src/demoServer.ts`).

## Next steps
_In order._

1. Install the APK on every demo phone; run the server + tunnel (README steps 4–5); `npx expo start --dev-client` in `mobile/`.
2. On each phone do README "First run on each phone" (server URL, name, PINs, contacts with Telegram Start, permissions "All the time").
3. Walk through the demo script on real phones and note anything broken:
   1. Walk from Hostel with a 2-min timer; leave a private zone → locations resume (check guardian page).
   2. Timer runs out → Telegram alert → guardian link shows live map.
   3. Duress PIN → "Walk cancelled" → alert actually goes out.
   4. Uneasy mode: say "bachao" → instant alert → recording → AI follow-up with nearest police.
   5. Airplane mode mid-walk → ~45 s later "lost contact".
   6. Escalation: set wait to 1 min in Rise; contact 1 ignores → contact 2 gets the agent's message → contact 2 presses "I'm on it".
   7. Help → medical fast-dial → dialler with 108, address in large text, family notified.
   8. Two phones: buddy match for the same route (email code is in the server log).
4. Set `AGENT_MODEL=anthropic/claude-opus-5.5` on the demo server (Haiku for testing).
5. Optional: build a `preview` APK (JS bundled) ≥ 90 min before the demo so phones don't depend on the laptop bundler.
6. Rehearse the demo.

## Decisions

- Notifier: **Telegram** (Twilio trial can't send custom message bodies). Console notifier for testing; console mode never polls Telegram.
- Speech-to-text for panic chunks: **Groq** `whisper-large-v3-turbo` (`server/src/stt/`); backup Deepgram.
- Agent: Cline SDK `@cline/sdk` 0.0.92 `Agent` with our own tools only (no file/shell tools), provider `cline` (Cline credits via `CLINE_API_KEY`). Model ids need a dot: `anthropic/claude-haiku-5.5` (testing), `anthropic/claude-opus-5.5` (demo).
- Escalation: plain-code ladder in the watchdog; agent can raise level (3 = everyone call 112 now). Duress / keyword / SOS start at level 2. Keyword/SOS send an AI follow-up to all inner contacts first; contact 1's personal ask comes one wait later.
- An alerted session can only be ended with the real PIN (starting a new walk does not end it).
- Medical fast-dial creates a `medical` session (no dead man's switch) so the family gets a live link.
- Escalation wait: default **300 s**, user can change it in Rise (1–15 min). For demo step 6, set it to 1 min.
- Maps: native `react-native-maps` (Google) for safe zones; Leaflet + OSM on the guardian page.
- Demo location: Guwahati, Assam (IIT Guwahati). Medical fast-dial: 108 in Assam, 112 elsewhere.
- Keyword listening defaults to **hi-IN** (hears "बचाओ" and "हेल्प"); en-IN selectable. Words: help, bachao (+ spellings) + one custom word.
- UI ("Talk sense" design system, `mobile/src/theme.ts` + `mobile/src/components/ui.tsx` + `art.tsx`): copied from `UI_reference/general app UI/design 1` (+ its video): Merriweather serif titles/buttons + Inter UI text, pink-wash backgrounds, centred serif headers with a magenta accent line, outlined icon chips, white chat bubbles/cards, stacked cards, pill message bar, black serif pill CTAs, plain white tab bar with serif labels. Profile/settings live at `/profile` (banner, square avatar, stats, tabs — like the reference profile). Rise tab = "Women in powerful roles" (`lib/women.ts`, Women Rise style: Playfair Display Black on colour blocks; portraits drawn in code, facts limited to well-documented public records). Fonts/icons are JS-only packages loaded at runtime with `expo-font`; the `expo-font` config plugin is intentionally NOT added. Gradients/shadows use RN 0.86 `experimental_backgroundImage` and `boxShadow`; never use the string `"none"` for these.
- SOS alarm (`lib/alarm.ts`): generated two-tone siren (`mobile/assets/sounds/siren.wav`, regenerate with `node scripts/make-siren.mjs`) looping at full player volume + continuous vibration; only for the SOS button (keyword triggers stay silent). System volume is forced to max by `react-native-volume-manager` — native, so it needs dev build #3+; older builds skip it. The "Stay with me" screen lists per-contact delivery from the server's `deliveries` table (`GET /sessions/:id/status`).
- Phone startup entry is `mobile/index.ts` (registers the background task before expo-router). Speech recognition is loaded lazily so the app also runs in Expo Go / on iPhone (keyword listening disabled there; Apple Maps on iOS).
- Buddy campus areas are a fixed list in `server/src/buddy/areas.ts` (edit for the real campus).

## How to run

- See `README.md` (fresh-laptop setup, server, tunnel, phone, tests). API: `docs/API.md`.

## Environment variables needed
_Name, what it is, where to get it. Real values are never written here or committed._

| Variable | What it is | Where to get it | Set up? |
|---|---|---|---|
| `PORT` | Server port (default 3000) | — | Default |
| `PUBLIC_BASE_URL` | Tunnel URL used in guardian links | Output of `npm run tunnel` (changes each restart) | Per session |
| `CLINE_API_KEY` | Agent LLM access, billed to Cline credits | app.cline.bot → Settings → API Keys | Yes |
| `AGENT_PROVIDER` | Cline SDK provider id (`cline`) | — | Default |
| `AGENT_MODEL` | `anthropic/claude-haiku-5.5` testing, `anthropic/claude-opus-5.5` demo (dot, not hyphen) | Set by team | Yes |
| `AGENT_TIMEOUT_SECONDS` | Max seconds per agent step before template fallback (25) | — | Default |
| `NOTIFY_PROVIDER` | `telegram` or `console` | — | Default |
| `TELEGRAM_BOT_TOKEN` | Sends alert messages to contacts (main demo channel) | Team private chat (@BotFather) | Yes |
| `TELEGRAM_BOT_USERNAME` | Bot username without @, used for contact link | @BotFather | Yes |
| `GROQ_API_KEY` | Speech-to-text (Whisper) for panic-mode audio chunks | Team private chat (console.groq.com) | Yes |
| `GOOGLE_MAPS_API_KEY` | Places API (New) (server) + Maps SDK for Android (EAS env var) | Team private chat (Google Cloud console) | Yes |
| `HEARTBEAT_TIMEOUT_SECONDS` | Dead man's switch timeout (45) | — | Default |
| `ESCALATION_WAIT_SECONDS` | Default escalation wait (300) | — | Default |
| `INSTITUTE_EMAIL_DOMAIN` | Allowed domain for buddy sign-up (`iitg.ac.in`) | Team decides | Yes |

## Accounts and keys status
| Service | Status |
|---|---|
| GitHub repo | `yashchoudhary14/safewalk` (private) |
| Telegram bot | Created |
| Cline API key | Working (checked with `npm run agent:ping`) |
| Groq (speech-to-text) | Working (smoke test transcribes) |
| Expo account (dev build) | Created |
| Google Places / Maps | Places API (New) working; legacy Places API is not enabled (not needed) |
| Twilio (optional) | Not used |

## Helplines (verified by team on 10 Oct 2026)

Used to build `data/helplines.json`. Fields: number, purpose, coverage, source URL, date verified (2026-10-10).

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

- **1091 (women helpline) has no source yet.** Left out of the JSON until the team adds an official source.

## Known issues and workarounds

- **App not yet tested on a phone.** Risky areas: background location permission flow on Android 14 ("Allow all the time" is a separate settings screen), speech recognition with the screen off (may stop in the background — keep the screen on for the demo), background audio recording, `experimental_backgroundImage` gradients (fall back to flat colours if unsupported).
- **npm 11 blocks install scripts.** After `npm ci` in `server/`, run `node node_modules\cloudflared\lib\cloudflared.js bin install` once (see README).
- **EAS uses npm 10 with `npm ci`.** Before a new build, check with `npx npm@10 install --package-lock-only --include=dev` in `mobile/`.
- **Only one server may poll the Telegram bot at a time** (409 Conflict). Test servers should use `NOTIFY_PROVIDER=console`.
- **Cline SDK types resolve to `any`** under NodeNext; `server/agent/tools.ts` keeps a local `AgentTool` shape. Runtime works.
- **Google Maps key is unrestricted** (hackathon shortcut). Restrict it to the package + SHA-1 after the demo.
- **Telegram limit:** a bot can only message people who pressed Start once. The app's "Add and share Telegram link" flow handles this; test it with every team phone before the demo.
- **Buddy email codes** are printed in the server log (allowed shortcut), not emailed.
- **`npm run smoke:ci` uses port 3000.** If the demo server is running, the test server can't start and the tests run against the live demo server and its database. Stop the demo server first.

## Last commit

- See `git log -1` (pushed to `origin` = `yashchoudhary14/safewalk`).
- Pushed from: Yash's laptop (Windows), folder `C:\dev\Cline hackathon - copy`.
