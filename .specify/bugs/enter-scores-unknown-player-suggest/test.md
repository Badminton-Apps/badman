# Bug Verification: Unknown-player suggestion

- **Slug**: enter-scores-unknown-player-suggest
- **Tested**: 2026-10-12 (updated after review)
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Unit tests, build and lint pass. A live run against toernooi.nl (visible browser, prod DB, save disabled) exercised the new code on two encounters. On encounter 1150 the unknown players were found and added. On encounter 373 TS returned no suggestion for memberId 51055198 on any of the 3 attempts, and the job failed with the new error naming that memberId. So the retry recovers slow responses but cannot fix a player TS does not offer; that case now fails with a clear message instead of a bare selector timeout.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Live run, players added | enter-scores on encounter 1150 (no save) | pass | unknown players added through the dialog |
| Live run, player not offered by TS | enter-scores on encounter 373 (no save) | expected failure | `TS returned no player suggestion for memberId 51055198 after 3 attempts` |
| Unit tests | `pnpm exec jest src/app/processors/enter-scores` in `apps/worker/sync` | pass | 117/117, 6 for `findPlayerSuggestion` |
| Build | `pnpm turbo run build --filter=worker-sync` | pass | |
| Lint | `pnpm turbo run lint --filter=worker-sync` | pass | 0 errors, existing warnings only; changed files clean |

## Changes after review

- The suggestion is no longer "the first link": a suggestion whose text contains the memberId wins; otherwise a single suggestion is used only if it is unchanged after a 1s settle. An ambiguous or partial-match list is never clicked, so the wrong player cannot be added to the TS team.

## Residual Risks

- The suggestion text format was not captured in the live run; the new log line records it on the next run.
- A player TS does not offer (373) still needs a manual fix on TS.

## Recommendation

Merge. Encounter 373 needs the player sorted out on TS before it can sync.
