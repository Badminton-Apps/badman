# Running Enter-Scores Locally with a Visible Browser

This guide explains how to run the **enter-scores** flow locally with a visible browser window so you can follow what is happening during score entry.

## 1. Enable the visible browser

Set this in your environment. For example, add to your `.env` file in the project root:

```env
VISUAL_SYNC_ENABLED=true
```

The app only treats it as enabled when the value is the string `"true"`. With this set, the Enter Scores processor launches Puppeteer in **non-headless** mode so you can watch the browser.

## 2. Credentials for enter-scores

Enter-scores needs Toernooi.nl credentials; otherwise the job fails preflight and does not run. In your `.env`:

```env
VR_API_USER=your_toernooi_username
VR_API_PASS=your_toernooi_password
```

## 3. Run the API and sync worker

Start both the API and the sync worker so jobs can be enqueued and processed:

```bash
npm run start:server
```

This runs the API and `worker-sync` in parallel. On startup, the worker logs whether visual sync is enabled (e.g. “Visual sync enabled, will show the browser window for debugging during check encounters and enter scores”).

## 4. Trigger an enter-scores job

Use the test script to enqueue EnterScores jobs:

1. Edit **`scripts/test-enter-scores.js`**: add one or more encounter UUIDs to the `encounterIds` array (from your database, GraphQL, or admin).
2. With the API and worker already running, run:

   ```bash
   node scripts/test-enter-scores.js
   ```

The script sends requests to `http://localhost:5010/api/v1/queue-job`. The worker picks up the jobs and, with `VISUAL_SYNC_ENABLED=true`, opens a visible browser window for each run.

**Authentication:** The queue-job endpoint normally requires a logged-in user with `change:job`. For local testing without a token (e.g. when OAuth2 gives an opaque token that causes "JWT malformed"), you can use a **dev-only bypass** — **NEVER set these in production.** Set `DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH=true` and `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID=<player-uuid>` in `.env` (or `.env.prod-db`). Use a Player ID that has `change:job` permission. The API will then accept unauthenticated queue-job requests and impersonate that player. The bypass is **disabled** unless `NODE_ENV=development`; the API logs a startup warning when these vars are set.

## 5. Optional environment variables

| Variable | Purpose |
|----------|---------|
| `DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH=true` | **DEV ONLY – NEVER IN PRODUCTION.** Allow unauthenticated queue-job requests; uses `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID` as the impersonated user. Disabled when `NODE_ENV` ≠ development. |
| `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID=<player-uuid>` | **DEV ONLY – NEVER IN PRODUCTION.** Player UUID with `change:job` to impersonate for unauthenticated queue-job when the bypass is enabled. |
| `ENTER_SCORES_ENABLED=true` | Actually save scores to toernooi.nl. Leave unset or `false` to only watch the flow without saving. |
| `HANG_BEFORE_BROWSER_CLEANUP=true` | Keep the browser open after the job for inspection. You must clean up browser instances manually (see startup warning). |
| `DEV_EMAIL_DESTINATION=your-email@example.com` | Receive success/failure email notifications. |

## Summary

1. Set `VISUAL_SYNC_ENABLED=true` and `VR_API_USER` / `VR_API_PASS` in `.env`.
2. Run `npm run start:server`.
3. Add encounter IDs to `scripts/test-enter-scores.js` and run `node scripts/test-enter-scores.js`.

The browser window will open and you can follow the enter-scores flow step by step.

---

## Running with production database (local Redis)

To test with real encounter data from production while keeping jobs on your machine:

1. **Edit `.env.prod-db`** in the project root: uncomment and set the production DB variables (`DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`). Add `DB_SSL=true` and `DB_DIALECT=postgres` if production uses SSL. Leave `REDIS_HOST=127.0.0.1` and `REDIS_PORT=6379` so the queue stays local.

2. **Start API and worker** with both env files (overrides from `.env.prod-db` apply after `.env`):

   ```bash
   ( set -a && source .env && source .env.prod-db && set +a && npm run start:server )
   ```

3. **Trigger jobs** as usual (e.g. add encounter IDs to `scripts/test-enter-scores.js` and run `node scripts/test-enter-scores.js`). Jobs go to local Redis; the worker reads encounter data from the production database and (for check-encounter) writes results back to it.

---

## Security: dev-only queue-job bypass

The env vars `DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH` and `DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID` **disable authentication** for the `queue-job` endpoint when `NODE_ENV=development`. This is intended only for local testing (e.g. running the test script without a JWT). **Never set these in production or staging.** The API enforces that the bypass is **disabled** unless `NODE_ENV=development` and logs a startup warning when either var is set.
