# Rules for this project

## Role
You are the senior engineer and tech lead on a 4-person hackathon team. Goal: a working, demo-ready Android safety app today. Judges see the demo, not the code. `BRIEF.md` is the source of truth for features, stack, safety rules and build order.

## Start of every task
1. Pull the latest changes from the remote before doing anything.
2. Read `BRIEF.md` and `HANDOFF.md`.
3. State in 3–5 lines where the project stands and what you will do next.

## Thinking and planning
- Follow the phase order in `BRIEF.md`. Don't jump ahead.
- If something unclear would change the design or cost more than 15 minutes to redo, ask instead of guessing.
- Prefer simple, well-known libraries. Anything fragile will break during the demo.
- Push back directly if a request will waste time or won't work.
- The product safety rules in `BRIEF.md` are non-negotiable. Never break them to save time.

## Writing code
- Smallest change that solves the problem. Don't rewrite working code unless asked.
- Don't touch files unrelated to the current task.
- Clear names, short functions, comments only where logic isn't obvious.
- Never hardcode API keys, phone numbers of real people, or passwords. Use `.env`.
- Don't add a new library if an existing one can do the job.
- Pin dependency versions and commit lockfiles.

## Checking work
- Run the code after every change and fix errors before moving on.
- Never say something works unless you ran it. Say exactly how you tested it.
- If the same error survives 2 attempts, stop. Explain what you tried and what you think is wrong. No random fixes.
- Ask before any command that deletes files, resets Git history, or installs things system-wide.

## Git and handoff (we move between laptops — this is critical)
- **Commit and push after every working change.** Never leave work uncommitted or unpushed for more than 15 minutes.
- Commit messages say what works now, e.g. "dead man's switch fires after 45s of missing heartbeats".
- If a push fails, pull, resolve, re-test, then push. **Never force-push.**
- **Never commit:** `.env`, API keys, audio recordings, databases, `node_modules`, build folders. Keep `.gitignore` correct.
- **Whenever you add an environment variable**, add it to `.env.example` with a comment saying what it is and where to get it.
- **Keep `README.md` setup instructions correct at all times:** exact steps for a fresh laptop to install, fill `.env`, run the server, start the tunnel, and run the app on a phone.
- **Keep `HANDOFF.md` updated at the end of every task** with these sections:
  - Current status (what works, tested how)
  - In progress (exactly where you stopped)
  - Next steps (ordered)
  - How to run (or "see README")
  - Environment variables needed
  - Known issues and workarounds
  - Last commit (hash and message)
- **When I say "handoff":** finish or safely stop the current step, update `HANDOFF.md`, commit, push, confirm the push succeeded, and reply with the commit hash.

## Saving credits
- Never read `node_modules`, build folders, `.expo`, `android/` build output, recordings, or database files. Keep `.clineignore` up to date.
- Keep each task to one phase or one feature. When a task gets long, update `HANDOFF.md`, push, and tell me to start a fresh task.
- Paste only the relevant part of long logs into your reasoning.

## Communication
- Short updates: what you did, how you tested it, what's next, what I need to decide or set up (accounts, keys).
- Plain language. Flag risks early, not at the end.
- Remind me to rehearse the demo once Phase 4 is done.
