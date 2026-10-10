# SafeWalk

Android personal-safety app (Expo) + Node server (Fastify) + guardian web page. See `BRIEF.md` for the product, `HANDOFF.md` for current status.

## Repo layout

- `mobile/` — Expo SDK 57 app (TypeScript, Expo Router, routes in `mobile/src/app/`)
- `server/` — Fastify API, timers, dead man's switch, storage (`server/src/`)
- `server/agent/` — Cline SDK escalation agent and its tools
- `server/public/` — guardian link page
- `data/helplines.json` — verified helpline numbers (every entry has a source URL)

## Fresh laptop setup (Windows, PowerShell)

### 1. Install once

- **Node.js 22.13 or newer** (`node --version`). Nothing else system-wide is required.
- **Git**.
- On the demo phones: install the SafeWalk development build APK (link in `HANDOFF.md`, or the latest finished build at https://expo.dev/accounts/astra-yages/projects/mobile/builds).

### 2. Clone and install

```powershell
git clone https://github.com/chhavimittal7489-svg/cline.git
cd cline
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

### 4. Run the server

```powershell
cd server
npm run dev
```

Check: open http://localhost:3000/health and you should see `{"ok":true,...}`.

### 5. Start the public tunnel (second terminal)

```powershell
cd server
npm run tunnel
```

Copy the `https://<random>.trycloudflare.com` URL it prints, then:

1. Put it in `server/.env` as `PUBLIC_BASE_URL=...` and restart the server (guardian links use it).
2. Open `<tunnel-url>/health` on a phone using mobile data to confirm it works.

The URL changes every time the tunnel restarts. Repeat both steps whenever that happens.

### 6. Run the app on a phone

1. The phone must have the SafeWalk **development build** installed (step 1). Expo Go will not work.
2. Put the laptop and phone on the **same Wi-Fi / hotspot**.
3. Start the bundler:

   ```powershell
   cd mobile
   npx expo start --dev-client
   ```

4. Open SafeWalk on the phone and scan the QR code or pick the laptop from the list.
5. If the phone can't reach the laptop (some networks block it), use `npx expo start --dev-client --tunnel`.

## Building a new development APK (only when native config changes)

Only needed after adding a native library or changing `app.json` plugins/permissions. JS changes don't need a rebuild.

```powershell
cd mobile
npx eas-cli@latest login            # once per laptop, team Expo account
npx eas-cli@latest build -p android --profile development
```

The Google Maps key is stored as the EAS environment variable `GOOGLE_MAPS_API_KEY` (environments: development, preview). It is injected by `mobile/app.config.ts` and is never committed. To set it on a new Expo project:

```powershell
npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value <KEY> --environment development --environment preview --visibility sensitive
```

## Checks

```powershell
cd server; npm run typecheck
cd mobile; npx tsc --noEmit; npx expo-doctor
```
