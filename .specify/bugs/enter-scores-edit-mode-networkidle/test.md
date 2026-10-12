# Bug Verification: Edit page wait

- **Slug**: enter-scores-edit-mode-networkidle
- **Tested**: 2026-10-12
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Unit tests pass. A real run against toernooi.nl is still needed to confirm the form selector exists on the edit page.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| New tests | `pnpm exec jest enterEditMode` in `apps/worker/sync` | pass | 4/4 |
| Regression suite | `pnpm exec jest src/app/processors/enter-scores` | pass | 115/115 |
| Real run (106) | visible browser, no save | not-run | see recommendation |

## Recommendation

Hold until the real run of encounter 106 passes the edit step.
