# Bug Assessment: Enter-scores fails at sign-in after skipping the cookie wall

- **Slug**: enter-scores-signin-cookiewall
- **Created**: 2026-10-12
- **Source**: pasted text (Slack thread in #… started by Jeroen Casier, BAD-350, plus worker-sync log for encounter c317dbba-102f-4755-9322-2ae98338efd9). URL policy: slack.com not on the allowlist, content was read through the Slack connector, no URL fetched.
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim or summarized)

Encounters finished and entered in Badman never get their scores pushed to toernooi.nl; federation staff have to type results by hand. Worker log for encounter 106 (`c317dbba…`, 4 Oct 2026):

```
LOG  [EncounterFormPageService] ... Cookie accept buttons not found — cookies likely already accepted, skipping
LOG  [EncounterFormPageService] User not signed in (profileMenu not found), proceeding with sign in
All selectors failed: [ 'Waiting for selector `Log in` failed: Waiting failed: 20000ms exceeded', 'Waiting for selector `body > div.content > ... > div.masthead__user > a` failed: ...' ]
ERROR [EnterScoresProcessor] EnterScores failed for encounter 106 [attempt 1/3]: Login button not found. Site layout may have changed or we're not on the expected page.
```
Identical on attempts 2 and 3 (6 minutes total), then the failure mail.

## Symptom

`EnterScoresProcessor` aborts in the `sign_in` phase with `Login button not found`; no players or scores are ever entered. Expected: it signs in (or recognises it is signed in) and continues to the encounter form.

## Reproduction

1. Worker browser profile (`chrome-profile-<pid>`) already holds the cookie-consent cookies but the toernooi.nl login session has expired.
2. Enqueue an EnterScores job. `acceptCookies` opens `/cookiewall/`, finds no accept button and returns early, leaving the page on the cookie wall.
3. `signIn` finds no `#profileMenu` and no masthead "Log in" link on that page and throws.

[NEEDS CLARIFICATION: what the cookie-wall page actually renders when cookies are already accepted — not observed, only inferred from the log.]

## Suspected Code Paths

- `packages/backend-pupeteer/src/accept-cookies.ts` — early `return` when no accept button is found keeps the page on `/cookiewall/` instead of a normal toernooi.nl page.
- `packages/backend-pupeteer/src/signIn.ts` — assumes the current page has the masthead login link; no recovery navigation when it is missing.
- `apps/worker/sync/src/app/processors/enter-scores/enter-scores.processor.ts:581-615` — cookie then sign-in phases.

## Root Cause Hypothesis

`acceptCookies` treats "no accept button on `/cookiewall/`" as success without leaving the cookie-wall page. When the persisted profile also has an expired login session, `signIn` runs on a page that has no "Log in" link and fails. Retries reuse the same profile, so all attempts fail identically. Confidence: medium (log pattern and code agree; page content not observed).

## Proposed Remediation

**Preferred**: in `signIn`, when the login button is not found and `#profileMenu` is still absent, navigate to `https://www.toernooi.nl/` (domcontentloaded), re-check `#profileMenu`, and retry the login-button lookup once before throwing. The error message should include the current URL.

**Alternatives**:
- Also navigate away in `acceptCookies` when it skips; rejected as the single fix because it does not cover other "wrong page" causes.

**Files likely to change**:
- `packages/backend-pupeteer/src/signIn.ts`
- `packages/backend-pupeteer/src/__tests__/signIn.spec.ts` (new)

**Tests to add or update**:
- signIn recovers: login button missing first, present after navigating home.
- signIn recovers when `#profileMenu` appears after navigating home.
- signIn still throws (with URL in message) when both attempts fail.

## Risks & Considerations

- Extra navigation costs at most one page load on the failure path; happy path unchanged.
- `signIn` is shared with other processors (check-ranking etc.); behaviour only changes on the previously failing path.

## Open Questions

- [NEEDS CLARIFICATION: do 373 / 1150 / 270 show this failure or the unknown-player one? Logs not yet seen.]
