# Candidate V4.2 — server-authoritative Coffee Card

This backend is intentionally separate from the Production Worker and Production D1.

## Why it is separate

The project workflow is Candidate first. V4.2 must be reviewable without adding unfinished routes or tables to Production. The Candidate UI will only call an API origin explicitly entered in the popup.

## Local / remote Candidate setup

1. Create a separate D1 database:

```bash
npx wrangler d1 create zefirok-candidate-v4-daily
```

2. Put the returned `database_id` into `wrangler.candidate-v4.jsonc`.

3. Apply the Candidate migration:

```bash
npx wrangler d1 migrations apply zefirok-candidate-v4-daily --remote -c candidates/V4/backend/wrangler.candidate-v4.jsonc
```

For local D1 use `--local` instead of `--remote`.

4. Set an admin key for the Candidate reward editor:

```bash
npx wrangler secret put CANDIDATE_ADMIN_KEY -c candidates/V4/backend/wrangler.candidate-v4.jsonc
```

5. Deploy the isolated Candidate backend:

```bash
npx wrangler deploy -c candidates/V4/backend/wrangler.candidate-v4.jsonc
```

6. Copy its HTTPS URL into `🧪 Управление Candidate / сервер` inside the Coffee Card popup.

7. Open `<candidate-backend-url>/admin` to configure seasons and milestone rewards.

## Mechanics

- Server time owns the day key; device time is ignored.
- One successful activity per server day is accepted.
- `progressDays` is soft progress: missing a day does not erase it.
- `streak` is strict: a full missed calendar day breaks the streak.
- Reward days are arbitrary and season-specific: 3, 5, 7, 14, 21, 28, 35, 42, 56, etc.
- Default TEST schedule is seeded by the migration.
- Reward claims are stored only in Candidate tables. They do not touch real balances, cases or Season Pass.
- Config is cached for 15 seconds in each Worker isolate. Saving through `/admin` invalidates the current isolate immediately.

## Promotion later

After approval, the same contract can be moved into the main Worker and mapped to the existing authoritative reward queue. That promotion is not part of V4.2.

## Candidate run integration

The Candidate game injects a tiny bridge into the embedded runner. After the existing local run settlement emits `zefirok-run-settlement-finished`, the outer Candidate popup calls the isolated daily backend. This is only for end-to-end Candidate QA.

When V4.2 is approved for Production, the daily progression call should move inside the authoritative Production run-settlement server path so a client event is never the authority for earning a day.
