# Bug Verification: Edit page wait

- **Slug**: enter-scores-edit-mode-networkidle
- **Tested**: 2026-10-12 (updated after review)
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The form selector the step now waits for (`input[id^="match_"][id$="_set_1"]`) exists on the real toernooi.nl edit page. A live run of encounter 106 with this change (visible browser, prod DB, save disabled) passed the edit step, entered all 8 games and passed row validation. That encounter had failed at this step with `Navigation timeout of 30000 ms exceeded` on the old code earlier the same day.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Live run | enter-scores on encounter 106 (`c317dbba-…`), no save | pass | edit step passed; 8/8 games entered; row validation clean |
| New tests | `pnpm exec jest enterEditMode` in `apps/worker/sync` | pass | 4/4 |
| Regression suite | `pnpm exec jest src/app/processors/enter-scores` | pass | 115/115 |

## Residual Risks

- One live run. The earlier failure happened on a fresh browser profile with a slow consent dialog, and the rerun was not under identical conditions, so it shows the new wait works, not that the old one always fails.

## Recommendation

Merge.
