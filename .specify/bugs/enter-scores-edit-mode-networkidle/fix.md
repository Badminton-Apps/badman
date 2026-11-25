# Bug Fix: Wait for the edit form, not network idle

- **Slug**: enter-scores-edit-mode-networkidle
- **Fixed**: 2026-10-12
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`enterEditMode` now loads with `domcontentloaded`, waits for the set-score inputs, then waits up to 5s for network idle and ignores a timeout there.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/worker/sync/src/app/processors/enter-scores/pupeteer/enterEditMode.ts` | modified | goto + form wait |
| `apps/worker/sync/src/app/processors/enter-scores/pupeteer/__tests__/enterEditMode.spec.ts` | added | 4 cases |

## Local Verification

- `pnpm exec jest src/app/processors/enter-scores` in `apps/worker/sync` → 6 suites / 115 tests pass.

## Deviations from Assessment

None.
