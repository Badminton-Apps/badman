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

## 5. Optional environment variables

| Variable | Purpose |
|----------|---------|
| `ENTER_SCORES_ENABLED=true` | Actually save scores to toernooi.nl. Leave unset or `false` to only watch the flow without saving. |
| `HANG_BEFORE_BROWSER_CLEANUP=true` | Keep the browser open after the job for inspection. You must clean up browser instances manually (see startup warning). |
| `DEV_EMAIL_DESTINATION=your-email@example.com` | Receive success/failure email notifications. |

## Summary

1. Set `VISUAL_SYNC_ENABLED=true` and `VR_API_USER` / `VR_API_PASS` in `.env`.
2. Run `npm run start:server`.
3. Add encounter IDs to `scripts/test-enter-scores.js` and run `node scripts/test-enter-scores.js`.

The browser window will open and you can follow the enter-scores flow step by step.
