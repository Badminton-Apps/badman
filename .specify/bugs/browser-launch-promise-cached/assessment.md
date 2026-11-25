# Bug Assessment: A failed browser launch is cached for the life of the process

- **Slug**: browser-launch-promise-cached
- **Created**: 2026-10-12
- **Source**: pasted text (local run, BAD-350): the first EnterScores jobs failed with `Could not find Chrome`; after the Chrome cache was fixed, later jobs in the same worker kept failing with the same error until the worker was restarted.
- **Verdict**: valid
- **Severity**: medium

## Symptom

After one failed `puppeteer.launch` (missing Chrome, SingletonLock, out of memory), every later `getBrowser`/`getPage` call re-throws the same error until the process restarts, even if the cause is gone.

## Suspected Code Paths

- `packages/backend-pupeteer/src/shared.ts` `getBrowser`: `browserPromise = createSharedBrowser(...)` is stored before it settles and is never cleared when it rejects. The next call returns `browserPromise` (still the rejected promise) via the "browser is being created" branch.

## Root Cause Hypothesis

`resetBrowserState()` is called on age-out and recovery paths but not on launch failure. Confidence: high (reproduced locally: three fixes later the worker still returned the first Chrome error until restarted).

## Proposed Remediation

**Preferred**: wrap the launch in try/catch and call `resetBrowserState()` before rethrowing.

**Files likely to change**: `shared.ts`, `__tests__/shared.spec.ts`.

## Risks & Considerations

- Callers waiting on the same in-flight launch still all receive that one rejection; only later calls relaunch.
- `activeRequestCount` is also incremented per failed call and never decremented; left alone here (existing retry paths behave the same).
