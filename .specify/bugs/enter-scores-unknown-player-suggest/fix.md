# Bug Fix: Retry unknown-player suggestion lookup

- **Slug**: enter-scores-unknown-player-suggest
- **Fixed**: 2026-10-12
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The type-memberId-and-wait step of `addUnknownPlayer` is now an exported `findPlayerSuggestion` helper: up to 3 attempts, each clearing the field and typing with a 50ms key delay, waiting up to 10s for `#ulSearchSuggest li a`. If all fail it throws `TS returned no player suggestion for memberId <id> after 3 attempts`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/worker/sync/src/app/processors/enter-scores/pupeteer/addUnknownPlayer.ts` | modified | helper extracted, retry, clearer error |
| `apps/worker/sync/src/app/processors/enter-scores/pupeteer/__tests__/addUnknownPlayer.spec.ts` | added | 3 cases |

## Tests Added or Updated

- first-attempt success; retry after a missing suggestion; error naming the memberId after 3 attempts.

## Local Verification

- `pnpm exec jest src/app/processors/enter-scores` in `apps/worker/sync` → 6 suites / 114 tests pass.

## Deviations from Assessment

None.

## Follow-ups

- Find which memberIds failed for 243 / 373 / 1150 / 270 once the new error message shows up in logs.
