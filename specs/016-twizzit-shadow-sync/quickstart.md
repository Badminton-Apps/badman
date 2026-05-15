# Quickstart: Twizzit Shadow Sync

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Initial backfill of Twizzit data into `twizzit.*` shadow tables. **No comparison** to Badman players yet.

---

## Prerequisites

1. Docker: `npm run docker:up` (Postgres + Redis).
2. Migrations applied: `npx sequelize-cli db:migrate` (includes `twizzit` schema migration from this feature).
3. Twizzit credentials in `.env` (from 1Password / staging tenant):

```bash
TWIZZIT_USERNAME=...
TWIZZIT_PASSWORD=...
# optional:
TWIZZIT_API=https://app.twizzit.com/v2/api
TWIZZIT_ORGANIZATION_ID=34245
```

4. Client lib built: `nx build integrations-twizzit-client`.

---

## Local one-shot backfill

```bash
# Terminal 1 — not required unless you want API up for other work
# nx run api:serve

# Run shadow worker (one-shot)
TWIZZIT_SHADOW_RUN_ON_BOOT=1 \
TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS=500 \
nx run worker-twizzit-shadow:serve
```

Expect logs per page: entity type, offset, record count. On completion the process exits `0`.

---

## Verify data

```sql
SELECT status, counts, started_at, finished_at
FROM twizzit.sync_run
ORDER BY started_at DESC
LIMIT 5;

SELECT COUNT(*) FROM twizzit.shadow_contact;
SELECT COUNT(*) FROM twizzit.shadow_membership;

-- Natural-key duplicates (Twizzit uniqueness probe)
SELECT first_name, last_name, date_of_birth, COUNT(*)
FROM twizzit.shadow_contact
GROUP BY first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;
```

---

## Resume after interruption

1. Note `sync_run.id` and last `sync_checkpoint` rows.
2. Re-run with resume (once implemented in tasks):

```bash
TWIZZIT_SHADOW_RUN_ON_BOOT=1 \
TWIZZIT_SHADOW_RESUME_RUN_ID=<uuid> \
nx run worker-twizzit-shadow:serve
```

Or start a fresh run — upserts are idempotent on `twizzit_id` (re-pages already completed work unless checkpoint resume is used).

---

## Render (production / staging)

1. Create **Background Worker** service pointing at `worker-twizzit-shadow` build artifact.
2. Set Twizzit + DB env vars (same as API).
3. **Default**: `TWIZZIT_SHADOW_RUN_ON_BOOT` unset — service stays up idle (or suspended).
4. For backfill: set `TWIZZIT_SHADOW_RUN_ON_BOOT=1`, **Resume** service in Render dashboard, watch logs, confirm exit 0, then **Suspend** service.
5. Register `system.Service` row with `renderId` for ops visibility.

Coordinate with Twizzit on rate limits before first production full pull (`docs/twizzit/gaps-and-open-questions.md` Q3).

---

## Tests

```bash
# Unit
nx test backend-twizzit-shadow

# Integration (postgres required)
npm run docker:up
RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/twizzit-shadow/jest.config.ts
```

---

## Out of scope (this feature)

- Diff shadow vs `public."Player"` — future spec.
- Writing to `Player` / `ClubPlayerMembership`.
- Legacy `apps/worker/sync/.../sync-twizzit.ts` XML path.
