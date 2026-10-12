# Bug Fix: Do not cache a failed browser launch

- **Slug**: browser-launch-promise-cached
- **Fixed**: 2026-10-12
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`getBrowser` now clears the cached launch promise when the launch rejects, so the next call launches again.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `packages/backend-pupeteer/src/shared.ts` | modified | try/catch around the launch, `resetBrowserState()` on failure |
| `packages/backend-pupeteer/src/__tests__/shared.spec.ts` | modified | new test: failed launch is not cached |

## Local Verification

- `pnpm exec jest` in `packages/backend-pupeteer` → 2 suites / 29 tests pass; the new test fails against the old `shared.ts`.

## Deviations from Assessment

None.

## Follow-ups

- `activeRequestCount` leak on failed launches and retry paths.
