# Feature Overview: Incomplete Team Formation & Empty Player Slots / Forfeit Sync

## Task Breakdown Table


| #   | Task                                                                                                                                                                                                         | Category | Complexity | Baseline Hours | AI-Adjusted Hours | Risk   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | -------------- | ----------------- | ------ |
| 1   | Audit and update all 8 assembly validation rules for null-safety (player-order, player-max-games, player-min-level, player-gender, player-comp-status, team-base-index, team-subevent-index, team-club-base) | BE       | M          | 4h             | 2h                | Medium |
| 2   | Add "team incomplete" warning to AssemblyValidationService when positions are null                                                                                                                           | BE       | S          | 1.5h           | 0.6h              | Low    |
| 3   | Write unit tests for all modified validation rules with null player positions                                                                                                                                | QA       | M          | 4h             | 2h                | Low    |
| 4   | Modify `matchGamesToAssembly.ts` to handle forfeit positions (null assembly players) with position-order fallback                                                                                            | BE       | L          | 8h             | 4h                | High   |
| 5   | Write unit tests for `matchGamesToAssembly` with forfeit edge cases                                                                                                                                          | QA       | M          | 3h             | 1.5h              | Medium |
| 6   | Modify `enterGames.ts` to skip `selectPlayer()` for empty positions and enter forfeit winner status                                                                                                          | BE       | M          | 4h             | 2h                | High   |
| 7   | Add `handleForfeitGame()` helper to `enterGames.ts` for clean separation                                                                                                                                     | BE       | S          | 1.5h           | 0.6h              | Low    |
| 8   | Verify `enterWinner.ts` works for forfeit status codes (4, 5, 6, 7)                                                                                                                                          | QA       | S          | 1h             | 0.5h              | Medium |
| 9   | Write integration tests for `enterGames` with forfeit games                                                                                                                                                  | QA       | M          | 3h             | 1.5h              | Medium |
| 10  | Update Assembly component UI: add visual "forfeit" indicator on empty player slots                                                                                                                           | FE       | M          | 3h             | 1.5h              | Low    |
| 11  | Update Assembly component: ensure save/proceed works with < 4 players (verify no blocking guard)                                                                                                             | FE       | S          | 1.5h           | 0.6h              | Low    |
| 12  | Update edit-encounter form: add "no player / forfeit" option to player dropdowns                                                                                                                             | FE       | M          | 4h             | 2h                | Medium |
| 13  | Update edit-encounter form: auto-fill 21-0 21-0 scores and forfeit winner when slot is empty                                                                                                                 | FE       | M          | 3h             | 1.5h              | Medium |
| 14  | Update edit-encounter HTML template for forfeit UI elements                                                                                                                                                  | FE       | S          | 2h             | 0.8h              | Low    |
| 15  | Add translation keys for "forfeit", "team incomplete", "no player" in NL and EN                                                                                                                              | FE       | S          | 1h             | 0.4h              | Low    |
| 16  | Update PDF export service to render empty assembly slots as "forfeit"                                                                                                                                        | BE       | S          | 2h             | 0.8h              | Low    |
| 17  | Add feature flag for forfeit sync in Puppeteer worker                                                                                                                                                        | BE       | S          | 1h             | 0.4h              | Low    |
| 18  | Manual testing against toernooi.nl: verify empty `<select>` behavior, save, error dialogs                                                                                                                    | QA       | M          | 4h             | 4h                | High   |
| 19  | Add new `EnterScoresErrorCode.FORFEIT_SYNC_FAILED` error code and Sentry tagging                                                                                                                             | BE       | S          | 0.5h           | 0.2h              | Low    |
| 20  | End-to-end test: create 3-player assembly, enter scores, verify sync                                                                                                                                         | QA       | M          | 3h             | 2h                | Medium |
| 21  | Documentation: update inline code comments for forfeit logic in enterGames and matchGamesToAssembly                                                                                                          | DOCS     | S          | 1h             | 0.4h              | Low    |


## Subtotals by Category


| Category      | Baseline Hours | AI-Adjusted Hours |
| ------------- | -------------- | ----------------- |
| BE (Backend)  | 22.5h          | 10.6h             |
| FE (Frontend) | 14.5h          | 6.8h              |
| QA (Testing)  | 18h            | 11.5h             |
| DOCS          | 1h             | 0.4h              |
| **Total**     | **56h**        | **29.3h**         |


## Grand Total


| Scenario               | Hours |
| ---------------------- | ----- |
| Optimistic             | 22h   |
| Expected (AI-adjusted) | 29h   |
| Pessimistic            | 42h   |


**Sprint allocation suggestion:** This feature fits within a single 2-week sprint for a solo developer with AI assistance. The pessimistic scenario accounts for toernooi.nl form behavior surprises that require debugging and adaptation.

## Parallelization Notes

### Can run in parallel:

- Tasks 1-3 (validation rule updates) and Tasks 10-15 (frontend changes) are fully independent
- Task 16 (PDF export) is independent of all other tasks
- Task 17 (feature flag) can run anytime

### Must be sequential:

- Task 4 (matchGamesToAssembly) before Task 6 (enterGames modification)
- Task 6 before Task 7 (forfeit helper extraction)
- Tasks 4-7 before Task 18 (manual toernooi.nl testing)
- Task 18 before Task 20 (E2E test)

### Critical Path:

**Task 4 -> Task 5 -> Task 6 -> Task 7 -> Task 9 -> Task 17 -> Task 18 -> Task 20**

This is the Puppeteer sync path. It carries the highest risk and has the most sequential dependencies.

---

## Agent Execution Tasks

Ordered, atomic instructions for a coding agent to execute one at a time.

### Phase 1: Backend Validation (can run in parallel with Phase 3)

**Task 1:** Read all 8 validation rule files in `libs/backend/competition/assembly/src/services/validate/rules/`. For each rule, identify where it accesses `single1`-`single4` or `double1`-`double4` player data. Add null checks: if the player for a position is `null`/`undefined`, skip that position's validation (do not report an error). Files: `player-order.rule.ts`, `player-max-games.rule.ts`, `player-min-level.rule.ts`, `player-gender.rule.ts`, `player-comp-status.rule.ts`, `team-base-index.rule.ts`, `team-subevent-index.rule.ts`, `team-club-base.rule.ts`. Expected output: all 8 files updated with null guards.

**Task 2:** In `libs/backend/competition/assembly/src/services/validate/assembly.service.ts`, in the `validate()` method (or `fetchData()`), add logic to detect empty assembly positions and include a warning message in the output: "Position {positionName} is empty -- this game will be treated as a forfeit." Use the existing `AssemblyValidationError` warning mechanism. Expected output: modified `assembly.service.ts`.

**Task 3:** In `libs/backend/competition/assembly/src/services/validate/assembly.service.spec.ts`, add test cases for: (a) assembly with 3 players (single4 = null), (b) assembly with all doubles filled but missing singles, (c) assembly with all positions null. Assert that validation returns valid=true with warnings (not errors). Expected output: updated spec file with new test cases.

### Phase 2: Puppeteer Sync (sequential, highest risk)

**Task 4:** In `apps/worker/sync/src/app/processors/enter-scores/pupeteer/matchGamesToAssembly.ts`, modify the `matchGamesToAssembly()` function. When `homePlayerIds` or `awayPlayerIds` for a position is `null`/`undefined`/empty, still include that position in the `gameAssemblyMap` with a special marker (e.g., `{ assemblyPosition: position, gameType, isForfeit: true }`). Add the `isForfeit` field to the return type. When a position is forfeit, do not try to match by player IDs; instead, map it directly to the position without a Game reference. Expected output: modified `matchGamesToAssembly.ts` with forfeit handling.

**Task 5:** Write unit tests in `apps/worker/sync/src/app/processors/enter-scores/pupeteer/__tests__/` for the updated `matchGamesToAssembly`. Test cases: (a) normal match with all players, (b) home team missing single4 player, (c) both teams missing a position, (d) MX team with forfeit in mixed double position. Expected output: new test file `matchGamesToAssembly.spec.ts`.

**Task 6:** In `apps/worker/sync/src/app/processors/enter-scores/pupeteer/enterGames.ts`, modify the game processing loop. After matching a game to an assembly position, check if `isForfeit` is true. If so: (a) find the form row by header using `findGameRowByAssemblyPosition()`, (b) do NOT call `selectPlayer()` for any position, (c) call `enterWinner()` with the appropriate forfeit status (e.g., `WINNER_STATUS.HOME_TEAM_FORFEIT` if home has no player, or `WINNER_STATUS.AWAY_TEAM_FORFEIT` if away has no player), (d) skip score entry. Extract this logic into a separate `handleForfeitGame()` function. Expected output: modified `enterGames.ts`.

**Task 7:** In `apps/worker/sync/src/app/processors/enter-scores/enter-scores.errors.ts`, add `FORFEIT_SYNC_FAILED = 'FORFEIT_SYNC_FAILED'` to `EnterScoresErrorCode`. Expected output: updated error enum.

**Task 8:** Write integration tests in `apps/worker/sync/src/app/processors/enter-scores/__tests__/` for enterGames with forfeit scenarios. Mock the Puppeteer page. Test: (a) forfeit game skips selectPlayer, (b) forfeit game enters correct winner status, (c) normal games still work alongside forfeit games in the same encounter. Expected output: updated or new test file.

### Phase 3: Frontend - Assembly (can run in parallel with Phase 1)

**Task 9:** In `libs/frontend/pages/competition/team-assembly/src/pages/create/components/assembly/assembly.component.ts`, verify that the component does not block save/proceed when player positions are empty. Verify that `gotRequired` only checks for team presence, not player count. If there is any blocking logic, change it to allow proceeding with a warning. Also update `assembly.component.html` to show a "Forfeit" badge on empty player slots (single1-4 drop zones). Expected output: modified TS and HTML files.

**Task 10:** In `libs/frontend/pages/competition/team-assembly/src/pages/create/create.page.ts`, verify that the `save()` method handles the validation warning dialog for incomplete teams. The existing `!this.validationOverview?.valid` check should trigger the warning dialog, allowing the user to confirm and proceed. No change expected unless the dialog flow is broken. Expected output: verification or minor fix.

### Phase 4: Frontend - Edit Encounter

**Task 11:** In `libs/frontend/pages/competition/event/src/pages/edit-encounter/edit-encounter.page.ts`, modify `createForm()` to add a `forfeit` boolean control per game row. In the template (`edit-encounter.page.html`), add a toggle/checkbox per game for "Forfeit / No player". When forfeit is toggled on: (a) clear the player controls for that game, (b) auto-set scores to 21-0 21-0, (c) set winner to the appropriate forfeit status. Expected output: modified TS and HTML files.

**Task 12:** Add translation keys. In the translation JSON files (find via `find libs/frontend -name "*.json" -path "*i18n*"`), add keys for `all.competition.team-assembly.forfeit`, `all.competition.team-assembly.team-incomplete`, `all.competition.encounter.no-player`. Provide both NL and EN translations. Expected output: updated translation JSON files.

### Phase 5: Supporting Changes

**Task 13:** In `libs/backend/competition/assembly/src/services/export/export.service.ts`, update the PDF generation to show "Forfait" (NL) for empty assembly slots instead of blank. Expected output: modified export service.

**Task 14:** Add a feature flag. In the ConfigService configuration (check `apps/worker/sync/src/app/processors/enter-scores/enter-scores.processor.ts` and `guards.ts`), add an `ENTER_SCORES_FORFEIT_ENABLED` environment variable. In the `enterGames` logic, check this flag before processing forfeit games. If disabled, skip forfeit positions entirely (current behavior). Expected output: modified guards.ts and enterGames.ts with feature flag check.

### Phase 6: Testing

**Task 15:** Manual testing checklist for toernooi.nl:

1. Log into toernooi.nl with test credentials
2. Navigate to an encounter form in edit mode
3. Leave one player `<select>` at default value
4. Attempt to save
5. Document: does it save? Does it show an error dialog? What validation messages appear?
6. Record findings in `docs/estimates/incomplete-team-forfeit/toernooi-test-results.md`

**Task 16:** E2E test: In `apps/badman-e2e/src/tests/assembly.e2e.spec.ts`, add a test case for creating an assembly with 3 players. Verify that the assembly saves successfully and shows a warning. Expected output: updated E2E test.

---

## Resolved Questions

1. **Is the frontend Angular or Next.js?** Resolved: Angular with Material Design. The impact map confirms this.
2. **Are schema changes needed?** Resolved: No. The existing schema supports nullable assembly positions and forfeit winner statuses.
3. **Does the edit-encounter form currently have a forfeit option?** Resolved: No. This is a new UI element.

## Open Questions

1. **How does toernooi.nl handle empty player selects?** This is the highest-risk unknown. If the form rejects empty selects, the entire sync approach needs rethinking. **Range impact: +0h (if accepted) / +8-16h (if rejected, need alternative approach like "ghost player" or forfeit checkbox on toernooi.nl form).**
2. **Should forfeit games have Game records in the DB?** Currently, the enterGames logic assumes a Game record exists for each assembly position. If forfeit positions have no Game records, the matching logic is simpler (just skip them) but the encounter score calculation needs a way to know about forfeits. **[ASSUMPTION] Forfeit games should have Game records with no players and a forfeit winner status, so the encounter score calculation works correctly.**
3. **What happens to the ranking point calculation for forfeit games?** The `recalculateEncounterCompetitionRankingPoints` mutation processes all games. Forfeit games with no players should yield 0 ranking points. **[ASSUMPTION] The `createRankingPointforGame` method already handles games with no players gracefully.**

