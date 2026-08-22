V4.2 remains Candidate-only.

Frontend:
- Candidate game stays isolated from Production API traffic.
- Legal onboarding is LOCAL and finishes without reload; after consent the embedded game is activated immediately.
- Coffee Card appears as a popup after the game becomes ready.
- The popup talks only to an explicitly configured Candidate API origin.

Backend:
- candidates/V4/backend is a separate Cloudflare Worker + separate D1 database.
- Server owns day key, active-day progress, streak, milestones and Candidate reward claims.
- One activity per server day is enforced by a unique D1 key.
- Rewards are Candidate ledger entries only; Production balances/cases/Season Pass are never modified.
- Reward schedule is season-specific and supports arbitrary days: 3/5/7/14/21/28/35/42/56/etc.
- Active configuration is cached for 15 seconds per Worker isolate and invalidated immediately on local admin saves.

Promotion to Production is intentionally NOT included in V4.2.
