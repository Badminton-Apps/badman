# Complexity & Risk Analysis: Incomplete Team Formation & Forfeit Sync

## 1. Security

### Findings

- **Authorization boundaries are preserved.** The existing `updateEncounterCompetition` mutation checks `change-any:encounter` permission or encounter-specific permission. No new endpoints or mutations are introduced.
- **Assembly save** (`createAssembly` mutation) requires an authenticated user (`@User() user: Player`). Empty player slots do not bypass this; the user must still be logged in.
- **No new attack surface.** The feature relaxes validation strictness (allowing fewer players) but does not introduce new data flows. The risk is that a malicious user could submit an assembly with intentionally empty slots to manipulate game outcomes. However, this is mitigated by the existing `validateAssembly` flow which will produce warnings.
- **Puppeteer credentials.** The sync worker uses `VR_API_USER` / `VR_API_PASS` for toernooi.nl login. No changes to credential handling. The risk is the same as today.
- **Input validation.** The `AssemblyInput` GraphQL type has nullable fields with `@Field(() => ID, { nullable: true })`. The `IsUUID()` filter in `fetchData()` already rejects non-UUID strings. Null/undefined values pass through safely.

### Risk: **Low**

No new authorization paths, no new data exposure, no changes to credential handling.

---

## 2. Privacy

### Findings

- **No new PII collection.** The feature does not introduce new personal data fields. Player IDs (already UUIDs) are used, not names or contact info.
- **Assembly data** stores player IDs in a JSON column. Empty slots mean fewer IDs stored, not more.
- **Toernooi.nl sync** already sends player member IDs to an external system. The change is to send *fewer* player IDs (skipping forfeit positions). This is a privacy improvement, not a regression.
- **No audit logging changes needed.** The existing `createdAt`/`updatedAt` timestamps on Assembly and Game models provide sufficient audit trail.

### Risk: **Low**

No new PII flows, no GDPR impact, marginally better privacy (fewer player IDs sent to external system).

---

## 3. Data Consistency

### Findings

- **Assembly save atomicity.** The `createAssembly` resolver uses Sequelize `findOrCreate` + `update`, which is not wrapped in an explicit transaction. This is an existing concern but is not worsened by this feature. [ASSUMPTION] The risk of race conditions on assembly save is the same as today.

- **Game-Assembly matching in sync.** The `matchGamesToAssembly` function must be modified to handle null assembly positions. The critical risk is:
  - **If a forfeit position has no Game record**, the sync must create the form row interaction without a DB game to reference. This is new territory.
  - **If a forfeit position has a Game record with no players**, the matching logic needs a fallback (currently matches by player IDs only).
  - **Race condition on `enterGames` transaction.** The sync uses `TransactionManager` for the `enterGames` phase. If the encounter is modified while sync runs, the transaction should catch this. No change needed.

- **Winner status consistency.** When a game is forfeit, the `winner` field must be set to the correct status (4, 5, 6, or 7). If the frontend sets this incorrectly, the `Game.updateEncounterScore()` hook will calculate wrong encounter scores. The `VALID_WINNER_VALUES` validation on the model prevents invalid values.

- **Score synchronization.** The `Game.updateEncounterScore()` after-hook correctly handles forfeit winner statuses in its reduce function (lines 240-258 of game.model.ts). `HOME_TEAM_FORFEIT` counts as an away win, `AWAY_TEAM_FORFEIT` counts as a home win. **This is already correct.**

- **Cache invalidation.** The `AssemblyValidationService` has player cache, club teams cache, etc. Empty player slots mean fewer cache entries, not more. No cache invalidation issues.

### Risk: **Medium**

The primary concern is the `matchGamesToAssembly` logic change. Matching forfeit positions without player IDs requires a new fallback strategy. If this fails, the sync will silently skip games or assign wrong players, which is exactly the bug this feature is meant to fix.

---

## 4. SOLID Principles

### Findings

- **Single Responsibility.** The `matchGamesToAssembly` function currently has one job: match games to assembly positions via player IDs. Adding a "match by position order" fallback adds a second matching strategy. This is acceptable if implemented as a clear fallback path, not a tangled conditional.

- **Open/Closed.** The validation rules in `libs/backend/competition/assembly/src/services/validate/rules/` extend a `_rule.base.ts` base class. Adding null-safety to each rule modifies existing code rather than extending it. This is a pragmatic violation -- creating new "nullable-aware" rule subclasses would be over-engineering.

- **Dependency Inversion.** The `enterGames` function directly calls `selectPlayer`, `enterScores`, `enterWinner`. Adding forfeit handling (skip player selection, enter forfeit winner) could be done inline or via a separate `handleForfeitGame` helper. The latter is preferred for testability.

- **Interface Segregation.** The `AssemblyInput` GraphQL type already has all fields nullable. No ISP violations.

- **Liskov Substitution.** Not applicable -- no class hierarchies are being modified.

### Risk: **Low**

Minor SRP concern in `matchGamesToAssembly`. Recommend extracting a `handleForfeitGame()` helper in `enterGames.ts` to keep the forfeit logic separate from the normal game entry path.

---

## 5. Operational Risk

### Findings

- **Deployment complexity: LOW.** No database migrations needed. No new infrastructure. The change is purely in application code. Can be deployed as a normal release.

- **Feature flag recommendation: YES.** The Puppeteer sync change is high-risk because it interacts with a third-party website. A feature flag for "allow forfeit sync" would enable:
  - Rolling out the frontend changes (assembly + score form) first
  - Enabling the sync changes separately after manual testing against toernooi.nl
  - Quick rollback if toernooi.nl rejects forms with empty player selects

- **Rollback strategy: SIMPLE.** Since there are no schema changes, rollback is a code revert. No data cleanup needed.

- **Performance at scale: NO IMPACT.** The feature removes work (fewer player selects, fewer API calls to toernooi.nl per encounter) rather than adding it.

- **Toernooi.nl dependency: HIGH RISK.** The entire sync feature depends on the behavior of toernooi.nl's form. If they change their form structure, selectors, or validation:
  - Empty `<select>` dropdowns might be rejected with a validation error
  - The "Foutmelding" error dialog might appear for incomplete games
  - The save button behavior might differ
  - [ASSUMPTION] Manual testing against toernooi.nl's staging or production environment is mandatory before deploying the sync changes

- **Monitoring.** The existing `EnterScoresError` error codes and Sentry tagging (`enter-scores` processor) provide good observability. Add a new error code for `FORFEIT_SYNC_FAILED` to distinguish forfeit-specific failures.

- **Email notifications.** The existing success/failure email system (`sendEnterScoresSuccessMail` / `sendEnterScoresFailedMail`) will cover forfeit encounters without changes.

### Risk: **Medium-High**

The toernooi.nl dependency is the primary operational risk. We cannot unit-test against the real toernooi.nl form. The existing error handling and retry mechanisms mitigate this somewhat, but a new bug in the sync could silently corrupt match data on the external platform.

---

## Overall Risk Rating: **Medium**

The primary risks are:

1. **Toernooi.nl form behavior with empty player selects** -- We are assuming the external system accepts this, but cannot verify without live testing. If it doesn't, the sync will fail with error dialogs or row validation messages. Mitigation: feature flag + manual testing + existing retry/notification infrastructure.

2. **`matchGamesToAssembly` logic rewrite** -- The current matching relies entirely on player IDs. Forfeit positions break this assumption. The fallback strategy (match by position order) is sound but adds complexity to a critical code path. Mitigation: comprehensive unit tests for the new matching logic with forfeit edge cases.

3. **Validation rule null-safety** -- All 8 validation rules must be audited and updated to handle null player positions. Missing a null check in any rule could cause runtime errors during assembly validation. Mitigation: systematic review of each rule + unit test coverage for null positions.
