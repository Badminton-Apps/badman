# Bug Fix: Enter-scores sign-in recovers from a page without the login link

- **Slug**: enter-scores-signin-cookiewall
- **Fixed**: 2026-10-12
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`signIn` now recovers when neither `#profileMenu` nor the masthead "Log in" link is on the current page: it navigates to `https://www.toernooi.nl/`, re-checks the profile menu, and retries the login-button lookup once. The final error names the page it was stuck on.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `packages/backend-pupeteer/src/signIn.ts` | modified | `hasProfileMenu` helper, homepage retry, URL in error |
| `packages/backend-pupeteer/src/__tests__/signIn.spec.ts` | added | 4 cases |

## Tests Added or Updated

- `signIn.spec.ts` — already signed in; recovery via homepage; profile menu on homepage; throws with stuck URL.

## Local Verification

- `pnpm turbo run test --filter=@badman/backend-pupeteer` → 3 suites / 32 tests pass.
- `pnpm turbo run lint` for the package → 0 errors (7 pre-existing `no-explicit-any` warnings).

## Deviations from Assessment

None. `accept-cookies.ts` was deliberately left unchanged (the alternative in the assessment).

## Follow-ups

- Confirm on a real run (visible browser) what the cookie-wall page shows when cookies are already accepted.
- Check logs for 373 / 1150 / 270 to see which failure mode they hit.
