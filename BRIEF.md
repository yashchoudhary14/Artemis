# SafeWalk (working name) — Project Brief

Read this whole file before planning or coding. It is the single source of truth for what we are building. If something here is unclear or seems wrong, ask before guessing.

## What we are building

An Android personal-safety app for women, piloted inside one institute (everyone signs up with a verified institute email). It has three parts:

1. **Mobile app** (Android) — the user's phone: walks, timers, safe zones, suspicion mode, panic mode, helplines.
2. **Server** — does the watching and alerting even if the phone dies: heartbeats, dead man's switch, alert sending, audio storage, and an AI escalation agent built with the **Cline SDK** (this earns bonus points — make it central and visible in the demo).
3. **Guardian link** — a web page family/friends open from the alert message. No app install needed.

This is a hackathon prototype. It must actually work end to end for the demo. Mocks are allowed only where listed under "Allowed shortcuts".

## Non-negotiable safety rules (the product's own logic)

These rules decide how the app behaves. Never break them, even to save time.

1. **The first alert never depends on AI.** Timer expiry, duress PIN, panic button, keyword hit, or dead man's switch timeout must send a fixed-template alert instantly using plain code. The AI agent only handles what comes after.
2. **AI can raise the alert level, never lower or cancel it.** No AI step may decide "this is probably fine" and stop an alert.
3. **No AI-generated phone numbers or places, ever.** Hospital and police data come only from the Google Places API. Helpline numbers come only from `data/helplines.json`, where every entry has a source URL. An entry without a source URL is hidden.
4. **AI summaries are labelled** "AI summary — may contain errors" and always link to the original audio.
5. **Safe zones stay on the phone.** Their coordinates are never uploaded to the server.
6. **Inside a safe zone:** no passive location tracking, no dead man's switch, no keyword listening. **The panic button and medical fast-dial always work, even inside a safe zone.**
7. **The duress PIN must look exactly like a normal cancel on screen**, while silently sending the alert.
8. **Alert messages use calm, factual wording**, e.g. "Lost contact with Priya near MG Road at 9:42 pm, battery 12%. Live link: …"

## Core features (the judges liked these — build them best)

### F1. Safe zones
- User draws one or more circles on a map (centre + radius 50–500 m) and names them (Home, Hostel).
- Geofencing runs on the phone. Entering a zone pauses passive tracking; leaving it while a walk or suspicion mode is on resumes tracking.
- **Done when:** entering a zone stops location uploads within 1 minute, leaving resumes them, and the panic button still works inside the zone.

### F2. Suspicion mode + keyword detection + AI follow-up
- User switches it on. It turns itself off after 30 minutes unless extended (saves battery, protects privacy).
- On-device speech recognition listens for the user's keywords (defaults: "help", "bachao", plus one custom word). Works offline where the phone supports it.
- Phone sends a heartbeat every 15 s. If heartbeats stop for 45 s (grace period for lifts and tunnels), the server fires the dead man's switch alert.
- Keyword detected →
  1. instant template alert to the inner circle (plain code, no AI),
  2. switch to panic mode (recording starts),
  3. the agent then sends a follow-up drafted from: the keyword heard, recent transcript snippets, location trail, battery level, nearest police station.
- To avoid microphone conflicts: speech recognition runs only *before* the trigger; after the trigger, it stops and audio recording takes over.
- **Done when:** saying the keyword sends the first alert within 10 s and the AI follow-up within 60 s.

### F3. Helplines and nearby help (credible sources only)
- `data/helplines.json`: national entries plus per-state entries. Fields: number, what it is for (in plain words), coverage (national or state name), source URL, date verified.
- Seed the national entries (112, 108, 102, 1091, 181, 100, 101) with empty source URLs. **A team member fills in and checks each source on an official government page.** Do not invent numbers or sources.
- The app shows each number with a one-line "use this for…" explanation, based on the user's current state.
- Nearby hospitals and police stations come from Google Places (nearby search + place details for phone numbers), sorted by distance, with a tap-to-call button and a "Source: Google Maps" label.
- **Medical fast-dial (one tap):** dials 108 (or the state's ambulance number from the JSON), sends location to the inner circle at the same moment, shows the user's current address in large text so they can read it to the operator, and lists the nearest hospitals.
- **Medical card** (blood group, allergies, conditions) — set in the app, shown on the guardian link.

### F4. Walking buddy (institute only)
- Sign-up with an institute email, verified by a one-time code.
- Walk request: start area, destination area, departure time. Match people with the same start and destination areas within ±15 minutes.
- Both accept → shared walk session. Each person's inner circle gets the buddy's name and photo. Both phones run their own dead man's switch.
- **Done when:** two test accounts on two phones get matched and both families receive the buddy's details.

## Supporting features (build only if they fit in the first ~4 hours)

- **Walk session with check-in timer:** start a walk with a destination and timer. Cancel with PIN; duress PIN silently alerts.
- **Escalation agent (Cline SDK):** after the first alert, message contact 1 → wait 2 minutes for acknowledgement → contact 2 → … → suggest calling 112, until someone presses "I'm on it" on the guardian link.
- **Guardian link page:** live location, route trail, battery, alert status, audio clips, AI summary, medical card. Polling every 3 s is fine.
- **Panic mode:** audio recorded in 10-second chunks and uploaded as soon as each chunk is ready; location every 5 s. If offline, queue chunks on the phone and retry. After upload, the server transcribes the chunks and the agent sends a summary.
- **Battery ≤ 10%:** send last location to the inner circle once.
- **Contact tiers:** inner circle gets everything (link, recordings, summaries); wider circle gets location only.
- **Low-network area flag:** pitch slide only, unless everything else is done.

## Tech stack (fixed — ask before changing anything)

- **Mobile:** Expo (React Native) + TypeScript, Android only. Needs an Expo development build (not Expo Go) because of background location and speech recognition.
- **Server:** Node.js 22 + TypeScript (Fastify), SQLite database, audio chunks stored on disk. Made public during the demo through a tunnel (e.g. cloudflared) so the guardian link works on any phone.
- **Agent:** Cline SDK inside the server. Provider and model read from `.env` (`AGENT_MODEL`), so testing can use a cheap model and the demo can use Claude Opus 5.5.
- **Guardian page:** simple web page served by the same server, map with Leaflet + OpenStreetMap tiles.
- **Notifications:** one `notify` interface in the server, so the provider can be swapped. Planning must propose the provider (first choice: Twilio trial with verified team numbers; fallback: Telegram bot if Indian SMS delivery fails).
- **Speech-to-text for recorded chunks:** behind one interface. Planning must propose the provider.
- **Places:** Google Places API, key in `.env`.

## Repo layout

- `mobile/` — Expo app
- `server/` — API, timers, dead man's switch, storage
- `server/agent/` — Cline SDK agent and its tools
- `server/public/` — guardian link page
- `data/helplines.json`
- `BRIEF.md`, `HANDOFF.md`, `README.md`, `.env.example`, `.gitignore`, `.clineignore`

## Build order (timeboxed — if a phase runs 30 min over, cut its optional parts)

- **Phase 0 (30 min):** repo skeleton, `.gitignore`, `.clineignore`, `.env.example`, `README.md` with fresh-machine setup, `HANDOFF.md`, server boots with a health route, **start the Expo development build immediately** (cloud builds can queue for a long time).
- **Phase 1 (1 h):** walk session, timer, PIN and duress PIN, heartbeats, dead man's switch, instant template alert.
- **Phase 2 (1 h):** escalation agent (Cline SDK), guardian link page, safe zones.
- **Phase 3 (1 h):** suspicion mode with keyword detection, panic mode audio chunks, AI follow-up and summary.
- **Phase 4 (1 h):** helplines, nearby help, medical fast-dial and medical card, walking buddy.
- **Phase 5:** buffer, polish, demo rehearsal.

## Agent tools (Cline SDK)

Give the agent these tools, each a small, tested function:
- `get_session_context` — location trail, battery, alert type, keyword, transcript snippets
- `send_notification` — to a contact through the `notify` interface
- `check_acknowledgements` — who pressed "I'm on it"
- `find_nearby` — hospitals or police via Google Places (returns only API data)
- `get_helplines` — from `data/helplines.json` for the user's state
- `get_transcripts` — transcribed panic-mode chunks

The agent writes messages and decides the next escalation step. It never invents numbers or places, and never cancels an alert.

## Demo script (everything must work for this)

1. Priya starts a walk from Hostel with a 2-minute timer; she leaves her safe zone and tracking resumes.
2. Timer runs out → instant SMS → family opens the guardian link and sees the live map.
3. She enters the duress PIN under pressure → screen shows "cancelled" → alert actually goes out.
4. Suspicion mode: she says "bachao" → instant alert → recording starts → AI follow-up arrives with the nearest police station.
5. Airplane mode mid-walk → 45 s later the server sends "lost contact" with the last location and battery.
6. Escalation: contact 1 doesn't respond → agent moves to contact 2 → contact 2 presses "I'm on it."
7. Medical fast-dial: one tap → dialler opens with 108, address in large text, family notified.
8. Walking buddy: two phones get matched for the same route.

## Allowed shortcuts (say so honestly in the pitch)

- One-time codes for institute email may be printed in the server log if email sending isn't set up in time.
- SMS/call providers on trial accounts with verified team phone numbers.
- Calls open the dialler with the number filled in (the user taps call).
- Google Places results only need to work around the demo location.
