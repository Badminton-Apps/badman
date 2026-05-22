# Technical Impact Map: Backend Encounter Games Generation

## Feature Summary

Move encounter game "generation" from the frontend to the backend so that the 8 games per encounter (4 doubles + 4 singles, or MX equivalents) are created once on the server. This fixes "ghost" games and duplicate-game bugs caused by frontend-derived slot matching and ad-hoc create-on-save. The frontend will consume `encounter.games` as the source of truth and only update/create by id when the user edits.

**Critical constraint:** Games have a `visualCode` that ties them to toernooi.nl. Sync **from** toernooi.nl creates/updates games by this code. Sync **to** toernooi.nl (EnterScores Puppeteer) can work **without** visualCode set in advance: it finds the form row by assembly position (see §3.2 and §6.1), then sets and persists `visualCode` when missing or wrong. Any backend generation should still set `visualCode` when available (e.g. from sync) so sync-from and future push runs stay aligned.

---

## 1. Database Layer

### Tables Affected


| Table                   | Schema     | Change Type                 | Description                                                                                                                                                                                                |
| ----------------------- | ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Games`                 | `event`    | **Logic / optional schema** | Games already have `visualCode`, `linkId`, `linkType`, `order`. `order` is completion order (frontend sends it); it is **not** slot index. Backend generation will create/update rows. Optional: add `matchName` or `slotIndex` for slot identity (frontend currently infers slot by gameType + players). |
| `GamePlayerMemberships` | `event`    | **Logic only**              | Backend will create memberships when generating games from assembly player data.                                                                                                                           |
| `EncounterCompetitions` | `event`    | **No schema change**        | No new columns. Generation is triggered per encounter.                                                                                                                                                     |
| `Assemblies` (personal) | `personal` | **No change**               | Read-only input for generation (formation: single1..4, double1..4).                                                                                                                                        |


### New Tables

**None required.** Existing schema supports games linked to encounter (`linkId` = encounter id, `linkType` = `"competition"`).

### Migrations

- **Optional:** Add `matchName` or `slotIndex` (e.g. `double1`, `single2`) for slot identity. **Do not** use `order` for slot: the frontend uses `order` as completion order (1 = first completed, 2 = second, …) and sends it on create/update. If we do not add a slot field, the frontend continues to infer slot by matching (gameType + players); backend generation can still align to the same canonical slots (e.g. assemblyPositions) for sync and future use.

---

## 2. ORM / Data Layer

### Models Affected


| Model                  | File (backend)                                                                      | Change                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Game`                 | `libs/backend/database/src/models/event/game.model.ts`                              | No schema change expected. Optional: add `matchName` if product wants explicit slot names. |
| `EncounterCompetition` | `libs/backend/database/src/models/event/competition/encounter-competition.model.ts` | No change. Has `getGames()`.                                                               |
| `Assembly`             | Assembly model / personal schema                                                    | Read-only for generation.                                                                  |


### Data Access Patterns

- **Encounter + games:** Already loaded via `EncounterCompetition.findByPk(id, { include: [Game, Assemblies, ...] })` in encounter resolver and sync.
- **Assemblies per encounter:** Fetched by encounter (home/away team) for formation data. Backend generation will need the same assembly shape (single1..4, double1..4) to resolve player IDs per slot.
- **Game create:** Today `Game.create()` is used in `GamesResolver.createGame()` and in sync processors. A new service will create games in bulk (or one-by-one) with `linkId` = encounter id, `linkType` = `"competition"`, and optional `visualCode` when available from toernooi.nl.

---

## 3. Services / Business Logic

### 3.1 New: Encounter Games Generation Service

**Location (proposed):** e.g. `libs/backend/competition/encounter/src/services/encounter-games-generation.service.ts` (or under existing encounter/competition lib).

**Responsibilities:**

- **Inputs:** Encounter id (or encounter entity with games, home/away, assemblies loaded).
- **Canonical slots:** Same 8 slots as frontend (M/F: double1..4, single1..4; MX: same logical slots, possibly different display order — see `ASSEMBLY_POSITION_ORDER` in `apps/worker/sync/.../assemblyPositions.ts`).
- **Per slot:** Resolve gameType (Single/Double/Mix), slot identity (if matchName/slotIndex field exists), and player IDs from home/away assembly for that slot.
- **Matching existing games:** If encounter already has games, match by (gameType + same player set) or by (gameType + empty players + visualCode) to avoid duplicates. If a slot field exists, assign it; do not use `order` for slot (order is completion order).
- **Creating missing games:** For slots with no matched game, create a new Game with linkId = encounter.id, linkType = "competition", gameType, players (GamePlayerMembership). Set `order` only when the game has a winner (completion order), or leave null. If a matchName/slotIndex field exists, set it to the canonical slot (e.g. double1, single2). If visualCode is available (e.g. from toernooi.nl sync), set it; otherwise leave null until sync or user flow provides it.
- **Idempotency:** "Generate" can be called multiple times (e.g. formation change); policy: create only for slots that still have no game, or "regenerate" and reassign. Must not create duplicate games for the same slot.

**Dependencies:** EncounterCompetition, Game, Assembly (or assembly data), GamePlayerMembership, possibly VisualService if we need to fetch match codes from toernooi.nl before creating games.

### 3.2 Toernooi.nl Sync (Critical)

**Sync FROM toernooi.nl (sync-events-v2):**

- **Encounter processor** (`apps/worker/sync/.../encounter.processor.ts`): Fetches matches via `VisualService.getGames(eventCode, encounterCode)`. For each match, queues `ProcessSyncCompetitionGame` with `gameCode: match.Code`. Removes DB games that are not in the visual list (by `visualCode`).
- **Game processor** (`apps/worker/sync/.../game.processor.ts`): Finds or creates game by `visualCode` (gameCode). Sets `game.linkId = draw.id` and `linkType = "tournament"` in v2 — [ASSUMPTION] competition encounters may use a different path (e.g. sync-events competition-sync uses `linkId: encounter.id`, `linkType: "competition"`). Backend-generated games must use `linkId = encounter.id` and `linkType = "competition"` so they are not removed or overwritten incorrectly.
- **Risk:** If sync deletes games that don’t have a `visualCode` present on toernooi.nl, then backend-created games without a visualCode could be deleted on next sync. **Must clarify:** Are encounter games always created on toernooi.nl first (so we always get visualCodes from sync), or can Badman create games that don’t exist on toernooi yet? If the latter, sync logic must not delete games that have `linkType === "competition"` and no visualCode, or we need another strategy (e.g. create placeholders on toernooi.nl).

**Sync TO toernooi.nl (EnterScores):**

- **enterGames.ts** does **not** require `game.visualCode` to be set beforehand to push a game. It uses an **assembly-position-based** flow:
  1. **matchGamesToAssembly** maps each game to an assembly position (e.g. single1, double2) from player assignments.
  2. For each assembly position in order, **findGameRowByAssemblyPosition** (in enterGames.ts) finds the correct form row **without using visualCode**: it gets the expected header for that position and team type from `getHeaderForAssemblyPosition` (e.g. "HD1" for M double1), scans the page for a table row with that header, and reads the `matchId` from the row’s form inputs (`match_<matchId>_t1p1` etc.). It also checks the row is empty (e.g. after clearFields).
  3. The returned `matchId` is used as the form target for that game. If the game had no or wrong `visualCode`, the code sets `game.visualCode = correctMatchId` and **saves to the database** (when a transaction is provided), so future sync and push runs see the correct code.
- So backend-generated games **without** visualCode can still be pushed: the worker resolves the row by assembly position and persists the discovered visualCode. Backend generation can create games with null visualCode; EnterScores will fill and persist it when pushing.

**Recommendation:** Backend generation can create games with or without visualCode. When visualCode is available (e.g. from sync-from-toernooi), set it at creation; when not, EnterScores will resolve the row by assembly position and persist visualCode. Document this so sync-from does not delete such games (e.g. by linkType or by not treating missing visualCode as "not on toernooi" for competition encounters).

### 3.3 Existing Game Create/Update

- **GamesResolver.createGame** (`libs/backend/graphql/src/resolvers/game/game.resolver.ts`): Used by frontend when user saves a new game. After backend generation, frontend may only call this for rare "extra" games or we restrict to update-only for the 8 slots.
- **Game update:** Existing update mutation remains for editing score/winner/players. Backend generation must not overwrite user-entered scores; only create/fill slot and players when game is new or empty.

### 3.4 Assembly Validation

- No change to assembly validation rules. Generation reads assembly data; it does not modify assemblies.

---

## 4. GraphQL Layer

### New or Modified Operations


| Operation                                    | Type               | Change                                                                                                                                                                            |
| -------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateEncounterGames(encounterId: ID)`    | **Mutation (new)** | Calls EncounterGamesGenerationService, returns encounter (with games) or list of games. Optional: trigger implicitly when entering Results step or when assemblies are completed. |
| `encounterCompetition(id)` / encounter query | Query              | No schema change. Response already includes `games`. Frontend will use `encounter.games` as the list to display (sorted by completion `order`; if backend adds matchName/slotIndex, display order can follow slot).                                      |
| `createGame`                                 | Mutation           | May become "create only if slot has no game" or deprecated for the 8-slot flow; frontend uses update for existing slots.                                                          |
| `updateGame`                                 | Mutation           | Unchanged.                                                                                                                                                                        |


### Input/Return Types

- **GenerateEncounterGamesInput:** `{ encounterId: ID }`.
- **Return:** Encounter (with games) or `{ games: [Game!]! }` so client can refetch or merge.

---

## 5. Frontend Impact

**Stack:** The current frontend is a Next.js 15 application in an external repo. This repo contains a legacy Angular frontend used only for reference. Frontend impact applies to the Next.js app (edit-encounter / Results step equivalent).

### 5.1 Results Step / Edit Encounter

- **Current:** Form builds 8 slots from `encounterCompetition?.games?.[i]` or empty object; frontend may have separate logic (e.g. `createGameObjects` / `getMatchingDatabaseGame`) that "generates" logical games from assemblies and matches to DB games. Saving a card can trigger `createGame` mutation.
- **After backend generation:** Encounter already has up to 8 games from backend (or from sync). Frontend displays `encounter.games` (sorted by completion `order`; slot identity is still inferred by gameType + players unless backend adds matchName/slotIndex). No client-side slot generation or matching; each card is bound to `game.id`. On save, frontend calls **updateGame** for existing id (including `order` when game is completed); **createGame** only if product allows ad-hoc extra games.
- **Files to simplify/change:** Next.js 15 frontend (external repo) — edit-encounter / Results step equivalent and any hook/component that implements `createGameObjects` / `getMatchingDatabaseGame`; same conceptual change: remove client-side generation, consume `encounter.games`.

### 5.2 When to Call Generate

- Option A: Explicit "Prepare results" / "Generate games" button that calls `generateEncounterGames(encounterId)`.
- Option B: Implicit when user opens Results step (or when both assemblies are complete) — frontend or backend triggers generation so that by the time the user sees the form, `encounter.games` is populated.
- Product decision; implementation can support both (e.g. mutation + optional auto-trigger in resolver when loading encounter for edit).

### 5.3 Detail Encounter (Read-only)

- Already iterates `encounterCompetition?.games`; no structural change. Sorting by backend `order` (completion order) keeps display consistent; if matchName/slotIndex is added, display can follow slot order.

---

## 6. Worker / Sync Impact

### 6.1 EnterScores (Puppeteer)

- **matchGamesToAssembly:** Matches DB games to assembly positions by player IDs (and fallback by empty placeholder + visualCode). If backend has already assigned one game per slot, matching can simplify to: order games by slot, map by position index.
- **enterGames and visualCode:** The flow does **not** depend on `game.visualCode` to find the form row. For each game (by assembly position), it calls **findGameRowByAssemblyPosition(page, teamType, assemblyPosition, logger)** which:
  - Uses `getHeaderForAssemblyPosition(teamType, assemblyPosition)` (from assemblyPositions.ts) to get the toernooi.nl header for that slot (e.g. "HD1", "DD2").
  - Finds the table row on the page with that header and reads the `matchId` from the row’s match inputs.
  - Verifies the row is empty via **isGameRowEmpty** (so we don’t overwrite filled rows).
  - Returns the matchId; if none or row not empty, returns null and enterGames throws.
- After obtaining the matchId, enterGames uses it for the rest of the step (select players, enter scores, enter winner). It then **validates/corrects** visualCode: if `game.visualCode` was missing or differed from the discovered matchId, it sets `game.visualCode = correctMatchId` and **saves to the database** (when transaction is provided). So games without visualCode or with a wrong one are still pushed, and the correct visualCode is persisted for future runs.
- **Impact for backend generation:** No change required in EnterScores for backend-generated games without visualCode; the existing assembly-position-based resolution and visualCode correction already support them.

### 6.2 Sync FROM toernooi.nl (ProcessSyncCompetitionEncounter / ProcessSyncCompetitionGame)

- Encounter processor removes DB games whose `visualCode` is not in the visual match list. Backend-generated games must either have a visualCode that exists on toernooi.nl or be excluded from this delete (e.g. by linkType or a "generated" flag). See §3.2.

---

## 7. Testing Impact

- **Unit:** New EncounterGamesGenerationService: test slot order (M/F vs MX), player resolution from assemblies, idempotency, and "create missing only" vs "reassign" policy.
- **Integration:** Encounter resolver + generation: call generateEncounterGames, assert 8 games, correct gameTypes and players per slot.
- **Sync:** Ensure sync-from-toernooi does not delete backend-generated games that have no visualCode (or that we never generate without visualCode when sync will run). EnterScores E2E or integration: encounter with backend-generated games (with visualCode) still fills form correctly.
- **Frontend:** Edit-encounter: load encounter after generation, verify 8 cards, save updates by id, no duplicate create.

---

## 8. Files Changed Summary

### New

- Service: Encounter games generation (e.g. `encounter-games-generation.service.ts`).
- GraphQL: Mutation `generateEncounterGames` and resolver method.
- Tests: Unit for generation service; integration for encounter + generation.

### Modified

- **Backend:** Encounter resolver (optional auto-trigger or call to generation service), possibly game resolver (restrict createGame for competition encounters to "missing slot only" or leave as-is).
- **Sync (worker):** Possibly adjust encounter/game processor so backend-generated games (linkType competition, or without visualCode) are not deleted by sync-from-toernooi; and ensure linkId/linkType are correct for competition.
- **Frontend (Next.js 15, external repo):** Edit-encounter equivalent and any game-generation hook: remove createGameObjects/getMatchingDatabaseGame; consume `encounter.games` by id; call generateEncounterGames when needed; use updateGame for saves on existing games.

### Unchanged

- Assembly validation, assembly save flow, PDF export, ranking points (games still exist and are updated as today).

---

## 9. Assumptions Log

- [CONFIRMED] Games for competition encounters use `linkId = encounter.id` and `linkType = "competition"`. Sync-events-v2 game processor uses draw.id/linkType "tournament" for a different flow; competition encounters use the encounter link. Backend generation must use the correct link (encounter.id + "competition").
- [CLARIFIED] visualCode is **not** required for pushing to toernooi.nl. EnterScores finds the form row by assembly position via `findGameRowByAssemblyPosition` and persists the discovered matchId as `game.visualCode`. Backend can create games with null visualCode; they can still be pushed and will get visualCode set and saved during EnterScores.
- [CLARIFIED] **Slot order and match names:** On the frontend, **matchName** (single1..4, double1..4) is the slot identity and is **never** sent to the backend; the frontend iterates slots in a fixed order (double1..4, single1..4; MX uses same set with different display order). The backend has no matchName field; the sync worker uses `ASSEMBLY_POSITION_ORDER` / `getHeaderForAssemblyPosition` in `assemblyPositions.ts` for the same logical slots. Backend generation must use the **same canonical slot set and order** (e.g. shared constant or assemblyPositions) so frontend, backend, and sync worker stay aligned; the frontend will continue to infer which game is which slot by matching gameType + players (and optionally visualCode). **Reference:** [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md).
- [CLARIFIED] **order vs slot:** The frontend sends and expects **order** as **completion order** (1 = first game completed, 2 = second, …); it is **not** slot index. So we **cannot** use `order` (1..8) for slot index. A **schema migration adding `matchName` or `slotIndex`** is required if the backend is to store which slot a game belongs to; otherwise the frontend keeps inferring slot by matching. Generation service: when creating games, leave `order` null (or set only when game is completed); if a slot field is added, set it per canonical slot. **Reference:** [games-slot-order-and-matchName.md](./games-slot-order-and-matchName.md).
- [CLARIFIED] The frontend that works with the API in this repo is the one targeted by the frontend analysis (createGameObjects, getMatchingDatabaseGame, useEncounterFormGames). The conceptual change is to remove client-side generation and use server-generated games by id. This repo also contains a **legacy** Angular frontend used only for reference (e.g. to see how features were implemented in the legacy codebase when building them in the current frontend); changes apply to the current frontend that consumes the API, not to the legacy one.

