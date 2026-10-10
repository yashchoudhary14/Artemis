# SafeWalk

Android personal-safety app (Expo) + Node server (Fastify) + guardian web page, with an AI escalation agent built on the **Cline SDK**. See `BRIEF.md` for the product, `HANDOFF.md` for current status, `docs/API.md` for every endpoint.

## Repo layout

- `mobile/` — Expo SDK 57 app (TypeScript, Expo Router). Screens in `mobile/src/app/`, logic in `mobile/src/lib/`
  - `(tabs)/` Home · Walk · SOS · Help · Rise (profile + settings); `zones.tsx`, `uneasy.tsx`, `buddy.tsx`
  - `lib/tracking.ts` background heartbeat (location task + foreground service), `lib/zones.ts` on-device safe zones, `lib/suspicion.ts` keyword listening, `lib/panic.ts` SOS + 10 s audio chunks with an offline upload queue
- `server/` — Fastify API, watchdog (timer + dead man's switch), SQLite, audio storage (`server/src/`)
- `server/agent/` — Cline SDK escalation agent, its tools and the escalation ladder
- `server/public/` — guardian link page (`/g/<token>`, Leaflet + OpenStreetMap)
- `data/helplines.json` — verified helpline numbers (every entry has a source URL)

## Fresh laptop setup (Windows, PowerShell)

### 1. Install once

- **Node.js 22.13 or newer** (`node --version`). Nothing else system-wide is required.
- **Git**.
- On the demo phones: install the SafeWalk development build APK (link in `HANDOFF.md`, or the latest finished build at https://expo.dev/accounts/astra-yages/projects/mobile/builds).

### 2. Clone and install

```powershell
git clone https://github.com/yashchoudhary14/safewalk.git
cd safewalk
cd server; npm ci; cd ..
cd mobile; npm ci; cd ..
```

Then download the `cloudflared` tunnel binary once (npm 11 blocks the package's own install script, so do it by hand; it lands inside `server/node_modules`, nothing system-wide):

```powershell
cd server; node node_modules\cloudflared\lib\cloudflared.js bin install; cd ..
```

### 3. Fill `.env`

```powershell
Copy-Item .env.example server\.env
notepad server\.env
```

Values are in the team's private chat. Every variable is explained in `.env.example`. Never commit `server/.env`.

Check the agent can reach its model (the model id needs a **dot**: `anthropic/claude-opus-5.5`):

```powershell
cd server; npm run agent:ping
```

### 4. Run the server

```powershell
cd server
npm run dev
```

Check: open http://localhost:3000/health and you should see `{"ok":true,...}`. The log says which notifier and agent model are active.

The database is created automatically at `server/data/safewalk.db` (gitignored). Audio and photos go to `server/data/audio/` and `server/data/photos/`. Delete `server/data/` to start fresh.

**Telegram:** only ONE running server may use the bot token at a time (Telegram returns `409 Conflict` otherwise). With `NOTIFY_PROVIDER=console` the server never touches Telegram, so test servers can't interfere with the demo server.

### 5. Start the public tunnel (second terminal)

```powershell
cd server
npm run tunnel
```

Copy the `https://<random>.trycloudflare.com` URL it prints, then:

1. Put it in `server/.env` as `PUBLIC_BASE_URL=...` and restart the server (guardian links use it).
2. Open `<tunnel-url>/health` on a phone using mobile data to confirm it works.

The URL changes every time the tunnel restarts. Repeat both steps whenever that happens, and update the server address in the app (Rise → Server).

### 6. Run the app on a phone

1. The phone must have the SafeWalk **development build** installed (step 1). Expo Go will not work. No new native modules were added after build #2, so that APK is enough.
2. Put the laptop and phone on the **same Wi-Fi / hotspot**.
3. Start the bundler:

   ```powershell
   cd mobile
   npx expo start --dev-client
   ```

4. Open SafeWalk on the phone and scan the QR code or pick the laptop from the list.
5. If the phone can't reach the laptop (some networks block it), use `npx expo start --dev-client --tunnel`.

### 7. First run on each phone

1. **Rise → Server**: paste the tunnel URL → *Save and test* → "Connected".
2. **Rise → You**: type the name → *Create my SafeWalk*.
3. **Rise → PINs**: a 4-digit PIN and a different 4-digit emergency (duress) PIN. Both stay on the phone.
4. **Rise → Your circle**: add each contact → share the Telegram link → they press **Start** in Telegram → *Refresh link status* shows "Telegram linked ✓".
5. Allow location **"All the time"**, microphone and notifications when Android asks.
6. Optional: **Rise → Medical card**, **Home → Private zones**.

## Building a new development APK (only when native config changes)

Only needed after adding a native library or changing `app.json` plugins/permissions. JS changes don't need a rebuild.

```powershell
cd mobile
npx eas-cli@latest login            # once per laptop, team Expo account
npx eas-cli@latest build -p android --profile development
```

For the demo you can also build a standalone APK with the JS bundled in (no laptop bundler needed): `npx eas-cli@latest build -p android --profile preview` (cloud builds can queue — start ≥ 90 min before the demo).

The Google Maps key is stored as the EAS environment variable `GOOGLE_MAPS_API_KEY` (environments: development, preview). It is injected by `mobile/app.config.ts` and is never committed.

## Checks

```powershell
cd server; npm run typecheck
cd mobile; npx tsc --noEmit; npx expo export --platform android --output-dir $env:TEMP\sw-export
```

### Server end-to-end tests

One command starts a throwaway server (console notifier, 10 s dead man's switch, cheap Haiku model), runs both suites and stops it (~4 min; uses the Cline, Groq and Google keys from `server/.env`):

```powershell
cd server; npm run smoke:ci
```

- `scripts/smoke-phase1.ts` (20 checks): walk, timer expiry, duress, dead man's switch, safe zone, cancel.
- `scripts/smoke-phase234.ts` (39 checks): helplines, Places, medical card, keyword → instant alert + AI follow-up < 60 s, audio upload (idempotent) + Groq transcript + AI summary, guardian page/audio, "I'm on it", escalation ladder, SOS, battery low, medical fast-dial, walking buddy.

All lines should say `PASS`. Alert and agent texts appear in the server log as `[console notify]` / `[agent …]`.
