# Handoff

Read this before continuing work on any laptop. Update it at the end of every task, then commit and push.

**Repo:** https://github.com/chhavimittal7489-svg/cline

## Current status
_What works right now, and how it was tested._

- Nothing built yet. Repo contains `BRIEF.md`, `.clinerules/clinerules.md` and this file.
- Telegram bot, Groq, Expo and Google Maps accounts are set up (key values are in the team's private chat, not in the repo).
- Helpline numbers and official sources collected by the team (see "Helplines" below).

## In progress
_Exactly where the last session stopped (file, function, half-done step)._

- Not started. Next session begins with the kickoff plan, then Phase 0.

## Next steps
_In order._

1. Make the build plan from `BRIEF.md` (Plan mode).
2. Phase 0: repo skeleton, `.gitignore`, `.clineignore`, `.env.example`, `README.md`, server health route, start the Expo development build.
3. Create `data/helplines.json` from the "Helplines" table below. Use exactly these numbers and source URLs. Do not add any number that isn't in the table.
4. Phase 1: walk session, timer, PIN and duress PIN, heartbeats, dead man's switch, instant template alert.

## How to run
_Or "see README" once the README has setup steps._

- Not runnable yet.

## Environment variables needed
_Name, what it is, where to get it. Real values are never written here or committed._

| Variable | What it is | Where to get it | Set up? |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Sends alert messages to contacts (main demo channel) | Team private chat (created via @BotFather) | Yes |
| `GROQ_API_KEY` | Speech-to-text (Whisper) for panic-mode audio chunks | Team private chat (console.groq.com) | Yes |
| `AGENT_MODEL` | Model the agent uses (cheap for testing, Opus 5.5 for demo) | Set by team | No |
| `GOOGLE_MAPS_API_KEY` | Places API (nearby hospitals/police) + Maps SDK for Android | Team private chat (Google Cloud console) | Yes |
| `TWILIO_*` | Optional real SMS | twilio.com trial | No |

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

- **Telegram limit:** a bot can only message people who have opened the bot and pressed Start once. Every emergency contact must do this during setup; the server must save their chat ID then. Build this into the "add contact" flow and test it with every team phone before the demo.

## Last commit

- Hash:
- Message:
- Pushed by / from which laptop:
- Credits key in use:
