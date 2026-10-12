# Bug Verification: Unknown-player suggestion

- **Slug**: enter-scores-unknown-player-suggest
- **Tested**: 2026-10-12
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Unit tests pass and the enter-scores suite is green. The real-site failure (match 243) was not reproduced, so it is unconfirmed whether retries fix it or whether TS simply has no suggestion for that memberId.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | real toernooi.nl run for 243 | not-run | needs live TS and a failing memberId |
| New tests | `pnpm exec jest addUnknownPlayer` in `apps/worker/sync` | pass | 3/3 |
| Regression suite | `pnpm exec jest src/app/processors/enter-scores` | pass | 114/114 |
| Lint / type-check | `pnpm turbo run lint --filter=worker-sync` | not-run | dependent packages not built in this worktree (`backend-compile` has no `node_modules`) |

## Residual Risks

- Real TS timing/selector behaviour is only mocked.
- A truly unknown memberId still fails, now with a diagnosable message.

## Recommendation

Hold. Verify with a visible-browser run against an encounter that has unknown players, then retrigger the 4 encounters.
