# backend-pupeteer

Headless browser automation layer for interacting with toernooi.nl. Used by several worker-sync processors (EnterScores, CheckEncounters, GetRanking) to accept cookies, sign in, navigate forms, and enter/read data.

## Browser Lifecycle

### Shared browser model

A **single Chromium instance** is shared across all jobs within one worker process (`shared.ts`). Each job gets its own `Page` (tab), but they all run inside the same browser.

```
Worker Process (PID 1234)
└── Shared Browser (puppeteer.launch)
    ├── userDataDir: ./tmp/chrome-profile-1234
    ├── Page (Job A) ← created via browser.newPage(), closed in finally
    ├── Page (Job B) ← next job, same browser
    └── ...
```

Why: launching a full Chromium instance per job is expensive (~1-3s, significant memory). Since EnterScores runs at `concurrency: 1`, there's no parallel-access risk. This was changed from a multi-browser-per-process model after resource/stability issues on Render.

### Profile & cookie persistence

Because all jobs share the same `userDataDir` (`./tmp/chrome-profile-${process.pid}`), **browser-level state persists across jobs**:

- Cookies (including cookie wall consent)
- Local storage, session storage
- Service workers, cache

This means that after the first job accepts cookies on toernooi.nl, subsequent jobs in the same process will already have those cookies set. The `acceptCookies` function is written to be **idempotent** — it probes for the cookie accept button with `page.$()` and returns early if the button isn't present (cookies already accepted).

### Browser restart triggers

The shared browser is restarted under these conditions (see `startBrowserHealthMonitoring`):

| Trigger | Threshold | Condition |
|---|---|---|
| Age | > 1 hour | Always |
| Too many pages | > 50 open tabs | Always |
| Inactivity | > 15 min idle | Only when 0 open pages |
| Disconnection | Browser crashes | Automatic via `disconnected` event |

Restarts only happen when `activeRequestCount === 0` (no jobs have pages open), preventing mid-job browser kills that would cause stalled jobs.

### Cleanup

`BrowserCleanupService` runs hourly to remove orphaned `chrome-profile-*` directories older than 2 hours and kill orphaned Chromium processes. On ephemeral systems (e.g. Render), the filesystem is discarded on shutdown anyway.

## Cookie Wall Flow

The `acceptCookies` function handles the toernooi.nl cookie consent wall:

1. Navigate to `https://www.toernooi.nl/cookiewall/`
2. If navigation is aborted (`ERR_ABORTED`) and we landed on a valid toernooi.nl page, cookies were already accepted — return early
3. Probe for the cookie accept button (`button[type="submit"]` or `button.btn.btn--success.js-accept-basic`) using a non-throwing `page.$()` call
4. If no button found, cookies are already accepted — return early
5. If button found, click it and wait for navigation
6. Optionally handle a secondary consent iframe dialog (nojazz.eu)

All callers (EnterScoresProcessor, CheckEncounterProcessor, GetRankingProcessor) wrap `acceptCookies` in a try/catch that treats timeouts and missing-element errors as non-fatal warnings, since they typically indicate cookies are already accepted from a prior job in the same browser session.

## Key Files

| File | Purpose |
|---|---|
| `src/shared.ts` | Shared browser singleton, page creation, element selectors |
| `src/accept-cookies.ts` | Cookie wall + consent dialog handling |
| `src/sign-in.ts` | toernooi.nl authentication |
| `src/errors.ts` | `ToernooiUnreachableError` for network failures |
| `src/cleanup.service.ts` | Orphaned browser/profile cleanup (cron) |

## Building

Run `nx build backend-pupeteer` to build the library.

## Running unit tests

Run `nx test backend-pupeteer` to execute the unit tests via [Jest](https://jestjs.io).
