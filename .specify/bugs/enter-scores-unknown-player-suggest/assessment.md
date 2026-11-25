# Bug Assessment: Adding an unknown player fails when TS shows no suggestion

- **Slug**: enter-scores-unknown-player-suggest
- **Created**: 2026-10-12
- **Source**: pasted text (failure mail for encounter efc65dce-d27c-4a8b-b78c-79017e854f56, match 243; Slack thread / BAD-350). URL policy: no URL fetched.
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

Failure mail, 2026-10-11T19:36:33Z:

```
Enter Scores Failed — Visual Code: 243
Error Details: Could not find element for selectors: [["#ulSearchSuggest"]]
```
Jeroen's observation: every encounter that failed needed one or more players added to the TS team (players missing from the base lineup).

## Symptom

When a player is not in the TS team select, `addUnknownPlayer` opens the "add player" dialog, types the memberId and waits for `#ulSearchSuggest`. If the suggestion list does not render within 5s the whole `enterGames` transaction rolls back (`ENTER_GAMES`) and the encounter stays unsynced. The error names neither the player nor the memberId. Successful runs (1 Oct, 11 Oct) show the same flow working, so it fails only sometimes.

## Reproduction

1. Encounter whose lineup includes a player missing from the TS team select.
2. Run EnterScores; the TS suggest endpoint returns slowly or nothing for the typed memberId.
3. `waitForSelectors([["#ulSearchSuggest"]])` times out after 5s and throws.

[NEEDS CLARIFICATION: whether TS returns no result for that memberId, or is just slow — not observable from the mail.]

## Suspected Code Paths

- `apps/worker/sync/src/app/processors/enter-scores/pupeteer/addUnknownPlayer.ts` — types at full speed, single 5s wait, no retry, error lacks memberId.
- `apps/worker/sync/src/app/processors/enter-scores/pupeteer/selectPlayer.ts` — only caller of `addUnknownPlayer` (plus validate/refill re-entry).

## Root Cause Hypothesis

The type → suggest step is a single attempt with a 5s timeout; the TS autocomplete is debounced and Ajax-backed, so a slow response or a dropped keystroke leaves the list absent and the job fails. A genuinely unknown memberId produces the same symptom with no useful message. Confidence: medium.

## Proposed Remediation

**Preferred**: extract the type-and-wait step into an exported helper that retries up to 3 times (clear the field, retype with a per-key delay, wait up to 10s for `#ulSearchSuggest li a`), and throws `TS returned no player suggestion for memberId <id> after 3 attempts` if all fail.

**Alternatives**:
- Only raise the timeout; rejected, does not recover a dropped keystroke and keeps the message useless.

**Files likely to change**:
- `apps/worker/sync/src/app/processors/enter-scores/pupeteer/addUnknownPlayer.ts`
- `apps/worker/sync/src/app/processors/enter-scores/pupeteer/__tests__/addUnknownPlayer.spec.ts` (new)

**Tests to add or update**:
- Suggest found on first try.
- Suggest found on the second try (field cleared and retyped).
- All attempts fail → error includes the memberId.

## Risks & Considerations

- Worst case adds ~30s per unknown player on the failure path; the job already tolerates longer waits (clear-fields alone waits 7s).
- Does not help if TS genuinely has no such member; the clearer error at least makes that diagnosable.

## Open Questions

- [NEEDS CLARIFICATION: memberId that failed for 243 and for 373/1150/270.]
