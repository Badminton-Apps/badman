# Technical Impact Map: Incomplete Team Formation & Empty Player Slots / Forfeit Sync

## Feature Summary

Allow teams to play with fewer than 4 players (e.g. 3 players), allow empty player slots in the encounter score form (treated as forfeits), and fix the Puppeteer sync to toernooi.nl so empty/forfeit slots leave the `<select>` dropdown at its default value instead of assigning the same player to multiple singles.

---

## 1. Database Layer

### Tables Affected


| Table                   | Schema     | Change Type           | Description                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Assemblies`            | `personal` | **Logic change only** | The `assembly` JSON column already supports nullable `single1`-`single4` and nullable arrays for `double1`-`double4`. No schema change needed -- empty slots are represented as `null`/`undefined`.                                                                                                                                                          |
| `Games`                 | `event`    | **Logic change only** | Games already have nullable player associations via `GamePlayerMemberships`. A forfeit game can have 0 players for one side. The `winner` column already has `HOME_TEAM_FORFEIT (4)`, `AWAY_TEAM_FORFEIT (5)`, `HOME_TEAM_PLAYER_ABSENT (6)`, `AWAY_TEAM_PLAYER_ABSENT (7)` statuses. The `status` column already has `WALKOVER` and `NO_MATCH` enum values. |
| `GamePlayerMemberships` | `event`    | **No change**         | When a player slot is empty, simply no row is inserted for that team/player position.                                                                                                                                                                                                                                                                        |
| `EncounterCompetitions` | `event`    | **No change**         | Score calculation in `Game.updateEncounterScore()` already handles forfeit winner statuses correctly.                                                                                                                                                                                                                                                        |


### New Tables: **None required**

### Migrations: **None required**

The existing schema already accommodates all nullable player slots and forfeit winner statuses. This is a logic-only feature.

---

## 2. ORM / Data Layer

### Models Affected


| Model                       | File                                                                                | Change                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Assembly` (DB)             | `libs/backend/database/src/models/event/competition/assembly.model.ts`              | **No change.** `AssemblyData` interface already has all single/double fields as optional (`single1?: string`).                                    |
| `Game` (DB)                 | `libs/backend/database/src/models/event/game.model.ts`                              | **No change.** Winner statuses for forfeits already defined (`WINNER_STATUS.HOME_TEAM_FORFEIT`, etc.). `status` enum already includes `WALKOVER`. |
| `EncounterCompetition` (DB) | `libs/backend/database/src/models/event/competition/encounter-competition.model.ts` | **No change.**                                                                                                                                    |


### Data Access Patterns

- **Assembly save** (`createAssembly` mutation in `assembly.resolver.ts`): Already handles `undefined`/`null` for individual positions. Filter logic `(assembly?.double1 || []).filter((id) => id != null)` already strips nulls. **No change needed.**
- **Assembly validation** (`assembly.service.ts` `fetchData`): Filters player IDs with `IsUUID()`. Null/empty slots will be filtered out naturally. **But validation rules need review** (see Section 3).

---

## 3. Services / Business Logic

### 3.1 Assembly Validation Service

**File:** `libs/backend/competition/assembly/src/services/validate/assembly.service.ts`

**Impact: MEDIUM** -- The `fetchData` method and validation rules must tolerate incomplete assemblies.

#### Validation Rules to Modify:


| Rule                    | File                                | Change Required                                                                                                                                              |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PlayerOrderRule`       | `rules/player-order.rule.ts`        | Must handle cases where a player position is `null`/empty. Currently likely assumes all 4 singles and all 4 doubles are filled. **Needs "skip null" logic.** |
| `PlayerMaxGamesRule`    | `rules/player-max-games.rule.ts`    | Should still work -- a missing player has 0 games. But needs verification.                                                                                   |
| `PlayerMinLevelRule`    | `rules/player-min-level.rule.ts`    | Should skip null positions.                                                                                                                                  |
| `PlayerGenderRule`      | `rules/player-gender.rule.ts`       | Should skip null positions.                                                                                                                                  |
| `PlayerCompStatusRule`  | `rules/player-comp-status.rule.ts`  | Should skip null positions.                                                                                                                                  |
| `TeamBaseIndexRule`     | `rules/team-base-index.rule.ts`     | Index calculation with `getBestPlayersFromTeam()` uses only provided players. **Needs verification** that it doesn't expect exactly 4 players.               |
| `TeamSubeventIndexRule` | `rules/team-subevent-index.rule.ts` | Same concern as above.                                                                                                                                       |
| `TeamClubBaseRule`      | `rules/team-club-base.rule.ts`      | Should work with fewer players.                                                                                                                              |


**New behavior needed:** When assembly has empty slots, the validation should return a **warning** (not an error) like "Team incomplete -- positions X are empty (forfeit)".

### 3.2 Assembly Export Service (PDF)

**File:** `libs/backend/competition/assembly/src/services/export/export.service.ts`

**Impact: LOW** -- PDF generation should render empty slots as "forfeit" or blank. Needs review.

### 3.3 Encounter Score Sync (Puppeteer - EnterScores)

**File:** `apps/worker/sync/src/app/processors/enter-scores/`

**Impact: HIGH** -- This is the core of the toernooi.nl bug fix.

#### Files to Modify:


| File                               | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pupeteer/enterGames.ts`           | **Lines 300-318:** Currently iterates player positions and calls `selectPlayer()` for each. When `foundPlayer` is `null`/undefined, it currently does `continue` (skips). **But the problem is upstream**: `matchGamesToAssembly` won't match games that have missing players. Need to handle the case where a game maps to an assembly position but has no players for one side. **The `if (!foundPlayer) continue;` is correct for skipping empty slots**, but we also need to NOT enter scores when a game is a forfeit, and instead enter the forfeit winner status. |
| `pupeteer/matchGamesToAssembly.ts` | **Lines 73-79:** Currently skips assembly positions where `homePlayerIds` or `awayPlayerIds` is null. **This must change**: if one side has null players (forfeit), the game should still be matched and the form row should be left with default `<select>` values for that side.                                                                                                                                                                                                                                                                                       |
| `pupeteer/selectPlayer.ts`         | **No change needed** for the function itself. The caller (`enterGames.ts`) should simply not call `selectPlayer()` when the player is null/missing.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pupeteer/enterScores.ts`          | May need to skip score entry for forfeit games, or enter 21-0 21-0 with the appropriate winner code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pupeteer/enterWinner.ts`          | Forfeit games need the correct winner status entered. Currently handles `winner > 2`. Forfeit statuses (4, 5, 6, 7) are already > 2 so this should work. **Needs verification.**                                                                                                                                                                                                                                                                                                                                                                                         |


#### Critical Logic Change in `enterGames.ts`:

The current flow is:

1. `matchGamesToAssembly()` -- matches games to assembly positions based on player overlap
2. For each matched game, find the form row, select players, enter scores

**New flow needed:**

1. `matchGamesToAssembly()` must also match forfeit games (where one or both sides have no players in the assembly)
2. For forfeited assembly positions (null in assembly data), find the form row by header
3. **Leave `<select>` dropdowns at default** (do NOT call `selectPlayer`)
4. Enter the forfeit winner status
5. [ASSUMPTION] Enter 21-0 21-0 scores for forfeited games OR leave scores empty depending on toernooi.nl expectations

### 3.4 Assembly Matching Logic

**File:** `apps/worker/sync/src/app/processors/enter-scores/pupeteer/matchGamesToAssembly.ts`

**Impact: HIGH** -- Current matching logic relies on player IDs from both assemblies to find the corresponding game. When a position has no players (forfeit), matching by player ID is impossible.

**New approach needed:**

- For positions where assembly has players: match by player IDs (current behavior)
- For positions where assembly has null/empty: match by position order (fallback) -- the game row is identified by the assembly position directly (via `findGameRowByAssemblyPosition`), so we can skip player matching and just process the row as forfeit
- [ASSUMPTION] When a position is forfeit, there may be no corresponding Game record in the DB at all, or there may be one with no players. Both cases need handling.

---

## 4. GraphQL Layer

### Modified Queries/Mutations


| Operation          | Type     | File                   | Change                                                                                                                    |
| ------------------ | -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `validateAssembly` | Query    | `assembly.resolver.ts` | No change to the resolver itself, but the service it calls (`AssemblyValidationService`) returns warnings for empty slots |
| `createAssembly`   | Mutation | `assembly.resolver.ts` | **Already handles nulls.** No change needed.                                                                              |


### New Types/Fields: **None required**

The `AssemblyInput` already has all fields as nullable. `AssemblyOutput` already has `warnings` field.

### Schema Impact: **None** -- No changes to `schema.gql`

---

## 5. Frontend Impact (Angular, not Next.js)

**Important note:** This project uses Angular (not Next.js) for the frontend. The tech stack description in the prompt mentions Next.js but the actual codebase is Angular with Material Design (not MUI).

### 5.1 Assembly Component (Team Formation - Step 1)

**File:** `libs/frontend/pages/competition/team-assembly/src/pages/create/components/assembly/assembly.component.ts`

**Impact: MEDIUM-HIGH**


| Area                                          | Change                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drag-drop validation** (`canDropPredicate`) | No change needed -- empty slots are simply positions with 0 players.                                                                                                                                                                                                                                                                                                                      |
| **Save flow** (`save()` in `create.page.ts`)  | Currently calls `validateAssembly` GraphQL query. If validation returns warnings for empty slots, the existing warning dialog flow already handles this: `this.validationOverview?.valid` becomes false, which triggers the "continue despite warnings?" dialog. **This may already work correctly.**                                                                                     |
| **UI indication**                             | Need a visual indicator on empty player slots showing "Forfeit" or "No player". Currently empty slots just show nothing.                                                                                                                                                                                                                                                                  |
| **Proceed guard**                             | [ASSUMPTION] There may be frontend validation that blocks proceeding when team is incomplete. Need to check if `gotRequired` or any other guard prevents saving with < 4 players. The current code checks `gotRequired = team != null` (team exists), not player count. **This appears to NOT block on incomplete teams -- the blocking likely happens in the backend validation rules.** |


### 5.2 Edit Encounter Component (Score Entry - Step 2)

**File:** `libs/frontend/pages/competition/event/src/pages/edit-encounter/edit-encounter.page.ts`

**Impact: MEDIUM**


| Area                     | Change                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player form controls** | Currently `getPlayer()` returns `undefined` for missing players. The form control gets `undefined`. **Need to add explicit "forfeit/no player" option** to the player dropdowns. |
| **Score auto-fill**      | When a game is marked as forfeit (no player), scores should auto-fill to 21-0 21-0.                                                                                              |
| **Winner auto-set**      | Forfeit games should auto-set the winner status to the appropriate forfeit code.                                                                                                 |
| **HTML template**        | `edit-encounter.page.html` needs a "forfeit" toggle or "no player" option per game row.                                                                                          |
| **Game score component** | `GameScoreComponentComponent` from `@badman/frontend-components` may need modification to show forfeit state.                                                                    |


### 5.3 Assembly V2 Component

**File:** `libs/frontend/pages/competition/team-assembly/src/pages/create/components/assembly-v2/assembly-v2.component.ts`

**Impact: LOW** -- This appears to be a newer version with signal-based state. Same changes as 5.1 would apply.

### 5.4 Translation Files

**Impact: LOW** -- Need new translation keys for "forfeit", "team incomplete", "no player" warnings.

---

## 6. Worker / Puppeteer Sync Impact Summary

The sync worker (`apps/worker/sync/`) is the most critical part of this feature because the toernooi.nl integration is fragile (Puppeteer-based form automation against a third-party website).

### Risk Areas:

1. `**matchGamesToAssembly` rewrite** -- Must handle positions with null players
2. `**enterGames` forfeit handling** -- Must skip `selectPlayer()` and correctly handle forfeit winner status
3. **Toernooi.nl form behavior** -- [ASSUMPTION] When a `<select>` is left at default value, toernooi.nl treats it as "no player". This needs manual verification.
4. **Row validation** -- `validateRowMessages()` may flag rows with default `<select>` as errors. This needs testing against the actual toernooi.nl form.
5. **Save dialog errors** -- toernooi.nl may show error dialogs for incomplete game rows. The `waitForSaveErrorDialog` handling may need adjustment.

---

## 7. Testing Impact


| Test Area                | Files                                       | Change                                                |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| Assembly validation spec | `assembly.service.spec.ts`                  | Add test cases for incomplete assemblies (3 players)  |
| Enter scores spec        | `enter-scores.processor.spec.ts`            | Add test cases for forfeit sync                       |
| Assembly logic spec      | `assembly-logic.spec.ts`                    | Add test cases for forfeit position matching          |
| Guards spec              | `guards.spec.ts`                            | Verify preflight allows encounters with forfeit games |
| Retry spec               | `retry-failed-encounters.processor.spec.ts` | Verify retry handles forfeit encounters               |
| E2E tests                | `assembly.e2e.spec.ts`                      | Add E2E test for 3-player team assembly               |


---

## 8. Files Changed Summary

### Must Change (Critical Path)

1. `apps/worker/sync/.../pupeteer/matchGamesToAssembly.ts` -- Handle null assembly positions
2. `apps/worker/sync/.../pupeteer/enterGames.ts` -- Skip player selection for forfeit positions, enter forfeit winner
3. `libs/backend/competition/assembly/src/services/validate/rules/player-order.rule.ts` -- Skip null positions
4. Multiple validation rules in `libs/backend/competition/assembly/src/services/validate/rules/` -- Null-safe checks

### Should Change (Important)

1. `libs/frontend/pages/competition/team-assembly/.../assembly/assembly.component.ts` -- Visual forfeit indicator
2. `libs/frontend/pages/competition/event/.../edit-encounter/edit-encounter.page.ts` -- Empty player option, auto-forfeit scores
3. `libs/frontend/pages/competition/event/.../edit-encounter/edit-encounter.page.html` -- Forfeit UI
4. Translation files -- New keys

### May Change (Verify First)

1. `libs/backend/competition/assembly/src/services/export/export.service.ts` -- PDF with forfeit slots
2. `apps/worker/sync/.../pupeteer/enterWinner.ts` -- Verify forfeit winner codes work
3. `apps/worker/sync/.../pupeteer/enterScores.ts` -- Verify score entry skip for forfeit

---

## 9. Assumptions Log

- **[ASSUMPTION]** The Angular frontend (not Next.js) is the primary UI. The tech stack context mentions Next.js but the codebase uses Angular.
- **[ASSUMPTION]** Toernooi.nl accepts forms where `<select>` player dropdowns are left at their default "select player" value, and treats this as "no player assigned" / forfeit.
- **[ASSUMPTION]** Forfeit games should have scores of 21-0 21-0 (standard badminton forfeit scores), not blank scores.
- **[ASSUMPTION]** The "team formation" step refers to the Assembly component (team-assembly), not team enrollment.
- **[ASSUMPTION]** The `isComplete` boolean on the Assembly model can be used to distinguish complete vs incomplete assemblies, but this may not be currently enforced.
- **[ASSUMPTION]** When a game has no player for one side (forfeit), the Game record either: (a) has no GamePlayerMembership rows for that side, or (b) does not exist at all. Both cases need handling in the sync.
- **[ASSUMPTION]** The encounter form's "step 1" and "step 2" mentioned in the feature request map to: Step 1 = Assembly creation (team-assembly component), Step 2 = Score entry (edit-encounter component).
- **[ASSUMPTION]** There is no existing "forfeit" button in the edit-encounter form. This is a new UI element.

