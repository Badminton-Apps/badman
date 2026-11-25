# Bug Assessment: Enter-scores edit page waits for networkidle0 and times out

- **Slug**: enter-scores-edit-mode-networkidle
- **Created**: 2026-10-12
- **Source**: pasted text (local visible-browser run for encounter 106, `c317dbba-102f-4755-9322-2ae98338efd9`; BAD-350)
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Symptom

`EnterScoresProcessor` failed in phase `edit_mode` with `Navigation timeout of 30000 ms exceeded`, before any player or score was entered. It was the first job on a fresh browser profile (cookie step also needed 40s to dismiss the consent dialog). The next three jobs on the same browser passed the same step.

## Suspected Code Paths

- `apps/worker/sync/src/app/processors/enter-scores/pupeteer/enterEditMode.ts` — `page.goto(..., { waitUntil: "networkidle0", timeout: 30000 })`. networkidle0 needs zero connections for 500ms, which ad and consent scripts can prevent; the call throws even when the form is already rendered.

## Root Cause Hypothesis

The step depends on the page's background traffic going quiet, not on the form being ready. Confidence: medium (one occurrence, passes on retry with a warm profile).

## Proposed Remediation

**Preferred**: `goto` with `domcontentloaded`, then wait for the set-score inputs (`input[id^="match_"][id$="_set_1"]`), then give the network at most 5s to settle without failing.

**Files likely to change**: `enterEditMode.ts`, new `__tests__/enterEditMode.spec.ts`.

## Risks & Considerations

- If the form selector is absent on a valid edit page the step would now fail where it used to pass; a real run is needed to confirm.

## Open Questions

- [NEEDS CLARIFICATION: Render logs for other timeouts at this step.]
