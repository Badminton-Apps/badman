# Feature Overview: Backend Encounter Games Generation

**Feature:** Generate the 8 encounter games once on the backend (from assemblies) so the frontend no longer "generates" them — avoiding ghost/duplicate games. Preserve toernooi.nl sync (visualCode).

**References:** [impact_map.md](./impact_map.md), [complexity_analysis.md](./complexity_analysis.md), [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md) (frontend use of matchName and order). Architecture (if present) is in the same directory.

---

## 1. Task Breakdown Table

| # | Task | Category | Complexity | Baseline Hours | AI-Adjusted Hours | Risk |
|---|------|----------|------------|----------------|-------------------|------|
| 1 | Define canonical slot order constant (shared or backend copy of ASSEMBLY_POSITION_ORDER); document M/F vs MX slot semantics for backend, frontend, sync | BE | S | 1 | 0.4 | Low |
| 2 | Add EncounterGamesGenerationService: inputs (encounter id + loaded encounter/assemblies), resolve 8 slots, gameType + players per slot from assemblies, match existing games by (gameType + player set) or (gameType + empty + visualCode), create missing games with linkId=encounter.id, linkType="competition"; set order only when game has winner (completion order) or leave null; idempotency policy (create-only-for-missing vs regenerate) | BE | L | 12 | 12 | High |
| 3 | Optional: DB migration for matchName or slotIndex if backend needs to store slot identity; order is completion order (not slot index) and cannot double as slot | DB | S | 2 | 0.8 | Low |
| 4 | GraphQL: add generateEncounterGames(encounterId: ID) mutation and resolver; call EncounterGamesGenerationService; return encounter with games (or games list); wire in encounter module | BE | M | 4 | 4 | Medium |
| 5 | Encounter resolver: optional auto-trigger generation when loading encounter for edit (or leave trigger to frontend only) | BE | S | 1.5 | 1.5 | Low |
| 6 | Sync (worker): adjust encounter processor so games with linkType==="competition" (or without visualCode in visual list) are not deleted when pruning DB games not in toernooi.nl match list | BE | M | 4 | 4 | High |
| 7 | Sync (worker): ensure ProcessSyncCompetitionGame sets linkId/linkType correctly for competition encounters (linkId=encounter.id, linkType="competition") when processing encounter games; align with game processor job payload (encounterId) | BE | M | 3 | 3 | High |
| 8 | EnterScores (matchGamesToAssembly / enterGames): already handles missing visualCode via assembly-position lookup (findGameRowByAssemblyPosition) and persists visualCode; document/assert; no contract change needed | BE | S | 1 | 1 | Low |
| 9 | Frontend (Next.js 15, external repo): edit-encounter equivalent — remove any createGameObjects/getMatchingDatabaseGame logic; consume encounter.games by id; build form from encounter.games (sorted by order); on save use updateGame for existing game id | FE | M | 5 | 5 | Medium |
| 10 | Frontend (Next.js 15, external repo): add trigger for generateEncounterGames (explicit button or on Results step open); call mutation when needed; refetch encounter.games after generate | FE | S | 2 | 2 | Low |
| 11 | GamesResolver.createGame: restrict or document for competition encounters (create only for missing slot / extra games) or leave as-is for rare extra-game flow | BE | S | 1 | 1 | Low |
| 12 | Unit tests: EncounterGamesGenerationService — slot order M/F vs MX, player resolution from assemblies, idempotency, create-missing-only vs reassign, no duplicate per slot | QA | M | 4 | 4 | Medium |
| 13 | Integration tests: generateEncounterGames mutation; encounter with 0 vs 8 existing games; assert 8 games, gameTypes and players per slot, linkId/linkType | QA | M | 4 | 4.8 | Medium |
| 14 | Integration/sync tests: sync-from-toernooi does not delete backend-generated competition games (linkType competition or no visualCode); EnterScores with backend-generated games (with visualCode) | QA | M | 4 | 4.8 | High |
| 15 | Frontend/e2e: edit-encounter after generation shows 8 cards; save updates by id; no duplicate create | QA | S | 2 | 2.4 | Low |
| 16 | Migration strategy for existing encounters: one-time job or migration step to run generation for encounters that have 0–8 games so they get canonical 8 slots; document rollback | BE | M | 4 | 4 | Medium |
| 17 | Documentation: API (generateEncounterGames), sync rules (competition vs tournament, visualCode lifecycle), slot order source of truth; inline comments for generation and sync guard logic | DOCS | S | 2 | 1.6 | Low |
| 18 | PR review, integration testing, regression (sync + EnterScores + frontend); fix issues | QA | M | 4 | 4.8 | Medium |

*AI adjustments: Boilerplate/scaffolding (task 3, 1, 17 partial) −60%; PR/review (task 18) +20%.*

---

## 2. Subtotals by Category

| Category | Sum (AI-Adjusted Hours) |
|----------|--------------------------|
| BE       | 30.7 |
| DB       | 0.8  |
| FE       | 7    |
| QA       | 16   |
| DOCS     | 1.6  |
| **Total**| **56.1** |

---

## 3. Grand Total and Sprint Suggestion

- **Optimistic:** 48 h (no migration issues; sync path already supports competition; frontend has no extra createGame paths).
- **Expected:** 56 h (~7 developer-days with AI).
- **Pessimistic:** 68 h (sync competition vs tournament path clarification; idempotency edge cases; migration for many existing encounters).

**Sprint allocation:** 1 sprint (2 weeks) with 1 dev + AI; or 2 sprints if risk mitigation (sync/visualCode) is done first.

---

## 4. Parallelization Notes

- **Can run in parallel:**  
  - Task 1 (slot constant) with task 3 (migration if any).  
  - Task 2 (generation service) can start once task 1 is done.  
  - Tasks 6–8 (sync/worker) can be done in parallel after task 2 design (linkId/linkType and delete rule) is fixed.  
  - Task 12 (unit tests for service) in parallel with task 4 (mutation).  
  - Frontend tasks 9–10 in parallel with backend after API contract (generateEncounterGames, encounter.games shape) is stable.
- **Sequential:**  
  - Task 4 (mutation) depends on task 2 (service).  
  - Task 6–7 (sync) should be done before task 14 (sync tests).  
  - Task 16 (migration) after task 2 and 4 are merged.

---

## 5. Critical Path

1. **Define slot order** (task 1) → **EncounterGamesGenerationService** (task 2) → **generateEncounterGames mutation** (task 4).  
2. **Sync adjustments** (tasks 6–7) depend on linkId/linkType and delete rule; they block **sync tests** (task 14) and **EnterScores** confidence (task 8).  
3. **Frontend** (tasks 9–10) depends on **mutation and encounter.games** (task 4).  
4. **Migration** (task 16) is last on the critical path after generation and mutation are stable.

---

## 6. Agent Execution Tasks

Ordered, atomic instructions for a coding agent. Assume `architecture.md` is in the same output directory when referenced.

1. **Canonical slot order**  
   - Add a shared constant or backend copy of the 8-slot order (M/F and MX) aligned with `apps/worker/sync/src/app/processors/enter-scores/pupeteer/assemblyPositions.ts` (`ASSEMBLY_POSITION_ORDER`).  
   - Output: Single source of truth (e.g. in backend competition lib or shared util) and short doc of slot index → gameType/matchName.

2. **EncounterGamesGenerationService**  
   - In `libs/backend/competition/` (e.g. encounter or new sub-lib), add `EncounterGamesGenerationService`.  
   - Inputs: encounter id or loaded encounter with games, home/away, assemblies.  
   - For each of 8 canonical slots: resolve gameType and player IDs from assemblies; match existing encounter game by (gameType + same player set) or (gameType + empty players + visualCode); if matchName/slotIndex field exists, assign it; do not use `order` for slot (order is completion order).  
   - For slots with no matched game: create `Game` with `linkId = encounter.id`, `linkType = "competition"`, gameType, `GamePlayerMembership`; set `order` only when game has a winner (completion order) or leave null; if matchName/slotIndex exists set it to canonical slot; set `visualCode` if available.  
   - Idempotency: implement chosen policy (create-only-for-missing or regenerate-and-reassign); prevent duplicate games per slot.  
   - Output: Service class with tests (stub); no GraphQL yet.

3. **Optional migration**  
   - If backend needs to store slot identity: add migration and model field for `matchName` or `slotIndex`; `order` is confirmed as completion order and cannot be used as slot index. Otherwise skip.  
   - Output: Migration file (if any) and rollback script.

4. **generateEncounterGames mutation**  
   - In `libs/backend/graphql/src/resolvers/event/competition/encounter.resolver.ts` (or appropriate resolver), add mutation `generateEncounterGames(encounterId: ID)` that calls `EncounterGamesGenerationService` and returns encounter with games (or list of games).  
   - Register in schema and encounter module.  
   - Output: Mutation, resolver method, schema update.

5. **Optional auto-trigger**  
   - In encounter resolver, when loading encounter for edit (e.g. by a flag or context), optionally call generation so encounter has 8 games before response; or leave trigger to frontend only.  
   - Output: Resolver change (if product chooses auto-trigger).

6. **Sync: do not delete competition games**  
   - In `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/encounter.processor.ts`, in the loop that removes DB games not in the visual list, exclude games where `linkType === "competition"` (or equivalent guard so backend-generated games without visualCode are not deleted).  
   - Output: Updated `processGames` (or equivalent) with guard and comment.

7. **Sync: linkId/linkType for competition**  
   - In `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/game.processor.ts`, when the job is for a competition encounter (e.g. job has `encounterId`), set `game.linkId = encounter.id` and `game.linkType = "competition"` instead of draw.id/"tournament".  
   - Ensure job payload supports `encounterId` and processor uses it when present.  
   - Output: Game processor and encounter processor job payload aligned; games for competition encounters have correct link.

8. **EnterScores contract**  
   - In `apps/worker/sync/src/app/processors/enter-scores/pupeteer/enterGames.ts` and `matchGamesToAssembly.ts`, document that the flow finds the form row by assembly position (`findGameRowByAssemblyPosition`) and persists `game.visualCode` when missing; no change needed for backend-generated games without visualCode.  
   - Output: Comments documenting assembly-position resolution and visualCode persistence.

9. **Frontend (Next.js 15, external repo): edit-encounter by id**  
   - In the Next.js 15 frontend (external repo), edit-encounter equivalent: remove any createGameObjects/getMatchingDatabaseGame logic; build form from `encounterCompetition.games` (sorted by `order`); bind each card to `game.id`; on save call `updateGame` for existing games by id.  
   - Output: Edit-encounter page and related components using `encounter.games` as source of truth.

10. **Frontend (Next.js 15, external repo): trigger generate**  
    - Add UI or flow to call `generateEncounterGames(encounterId)` (e.g. "Prepare results" button or on Results step open); after success refetch encounter so `encounter.games` is updated.  
    - Output: Button or automatic trigger and refetch after generate.

11. **createGame restriction**  
    - In `libs/backend/graphql/src/resolvers/game/game.resolver.ts`, document or implement rule for competition encounters: createGame only for missing slot or extra games; reject or allow based on product rule.  
    - Output: Resolver logic or comment and tests if changed.

12. **Unit tests: EncounterGamesGenerationService**  
    - Tests for slot order (M/F vs MX), player resolution from assemblies, idempotency (no duplicate per slot), create-missing-only vs reassign.  
    - Output: Unit test file(s) for the service.

13. **Integration tests: generateEncounterGames**  
    - Call mutation for encounter with 0 games and with 8 existing games; assert 8 games, correct gameTypes and players per slot, linkId/linkType.  
    - Output: Integration test(s) for mutation and encounter + games.

14. **Sync/EnterScores tests**  
    - Integration or e2e: sync-from-toernooi does not delete games with linkType "competition" (or without visualCode in list); EnterScores with backend-generated games that have visualCode still fills form.  
    - Output: Test(s) covering sync delete rule and EnterScores.

15. **Frontend/e2e: edit-encounter**  
    - After generation, open edit-encounter; verify 8 cards; save; verify updates by id and no duplicate create.  
    - Output: E2E or frontend test for edit-encounter flow.

16. **Migration for existing encounters**  
    - One-time script or migration step: for encounters with 0–8 games, call generation (or new service method) to ensure canonical 8 slots; document rollback.  
    - Output: Script or migration and short runbook.

17. **Documentation**  
    - API doc for `generateEncounterGames`; sync rules (competition vs tournament, when games are deleted, visualCode lifecycle); slot order source of truth; inline comments for generation and sync guards.  
    - Output: Updated API docs and inline comments.

18. **PR review and regression**  
    - Run full integration and regression (sync, EnterScores, frontend); address review and failures.  
    - Output: Green CI and merged PR.

---

## 7. Definition of Done / Acceptance Criteria

- **Generation:** Encounter has exactly 8 games (or MX equivalent) after `generateEncounterGames`; each game has correct gameType, players from assemblies, `linkId` = encounter.id, `linkType` = "competition"; `order` is completion order (set when game has winner) or null; if matchName/slotIndex exists, set per canonical slot.
- **Idempotency:** Calling generate again does not create duplicate games for the same slot; existing games are matched and only missing slots get new games (or policy is clearly “reassign” and documented).
- **Sync FROM toernooi.nl:** Backend-generated competition games are not deleted when they are not in the visual match list (guard by linkType or equivalent).
- **Sync TO toernooi.nl (EnterScores):** Games with or without `visualCode` push correctly; EnterScores resolves form row by assembly position and persists visualCode when missing.
- **Frontend:** Edit-encounter shows 8 cards from `encounter.games`; save uses `updateGame` by id; no client-side slot generation or duplicate create for the 8 slots.
- **Migration:** Existing encounters can be normalized to 8 games via one-time run; rollback is documented.
- **Tests:** Unit (service), integration (mutation + sync), and frontend/e2e (edit-encounter) pass.

---

## 8. Resolved and Open Questions

**Resolved (from impact_map / complexity_analysis):**

- Games for competition encounters use `linkId = encounter.id`, `linkType = "competition"`; sync must set and preserve these.
- visualCode is **not** required for pushing to toernooi.nl: EnterScores finds the form row by assembly position via `findGameRowByAssemblyPosition` and persists the discovered matchId as `game.visualCode`; backend can create games with null visualCode.
- Slot order is defined in one place (e.g. assemblyPositions or shared constant); backend uses same semantics as sync worker and frontend; see games-slot-order-and-matchName.md.
- `order` is completion order (not slot index); add matchName/slotIndex migration only if backend needs to store slot identity.

**Open (may change estimates):**

- **Toernooi-first vs Badman-first:** Are encounter games always created on toernooi.nl first (so visualCodes exist after sync), or can Badman create games that don’t exist on toernooi yet? Affects whether sync must exclude competition games without visualCode from delete.
- **Idempotency policy:** Create-only-for-missing vs full regenerate-and-reassign; confirm and document so implementation and tests are consistent.
- **Competition sync path:** Confirm that competition encounter sync uses encounter.id + "competition" in game processor (not draw.id + "tournament") and that job payload includes encounterId where needed.
- **Frontend hooks:** Frontend is Next.js 15 in an external repo; exact paths for createGameObjects/getMatchingDatabaseGame are in that repo; conceptual change is to remove client-side generation and use `encounter.games` by id.

---

## 9. Risk Summary

- **High:** Sync deleting backend-generated games (mitigated by task 6); linkId/linkType wrong for competition (mitigated by task 7); idempotency and slot identity (mitigated by task 2 and 12).
- **Medium:** Matching existing games (gameType + players / visualCode) edge cases; migration for many encounters; frontend refactor scope.
- **Low:** Slot order drift (mitigated by task 1); EnterScores unchanged if visualCode present; documentation and comments.

Keep toernooi.nl sync behavior, idempotency, and linkId/linkType consistency in mind during implementation and review.
