# Bug Verification: Enter-scores sign-in after cookie wall

- **Slug**: enter-scores-signin-cookiewall
- **Tested**: 2026-10-12
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Unit tests pin the recovery behaviour and pass; no regressions in the package. The original failure was not reproduced against the real site, so the root cause (what the cookie-wall page renders) remains unconfirmed.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | real toernooi.nl run with expired session | not-run | needs visible-browser run against prod DB / TS |
| New tests | `pnpm exec jest signIn` in `packages/backend-pupeteer` | pass | 4/4 |
| Regression suite | `pnpm turbo run test --filter=@badman/backend-pupeteer` | pass | 32/32 |
| Lint | `pnpm turbo run lint --filter=@badman/backend-pupeteer` | pass | 0 errors, 7 pre-existing warnings |
| Type-check / build | `pnpm turbo run build` | pass for backend-pupeteer; `@badman/backend-compile` build fails in this worktree (`node_modules` missing, unrelated) | |

## Residual Risks

- If the cookie wall is not the cause, the homepage retry may not help.
- Downstream `worker-sync` could not be type-checked here because the worktree lacks installed deps for other packages.

## Recommendation

Hold. Run encounter 106 once with a visible browser (no save) after merge to confirm, then retrigger.
