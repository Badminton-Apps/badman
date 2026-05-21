# Encounter Games Sync (toernooi.nl)

How competition encounter games are pulled from toernooi.nl (Visual Reality) into the database, how local entries interact with synced data, and how the "always 8 games per encounter" invariant is enforced.

> **Which pipeline runs in production?** The v1 sync chain under `apps/worker/sync/src/app/processors/sync-events/competition-sync/`. The v2 pipeline under `sync-events-v2/competition/` is a partial migration — its processors are not wired up in `app.module.ts` and no entry-point queues `Sync.ProcessSyncCompetitionEvent`. Ongoing v2 work lives on branch `feat/v2-competition-sync`.

---

## Table of Contents

1. [Summary](#summary)
2. [Components](#components)
3. [Flow](#flow)
4. [Sequence Diagram](#sequence-diagram)
5. [Merge policy (per-field)](#merge-policy-per-field)
6. [Slot State Matrix](#slot-state-matrix)
7. [Protecting local data on deletes](#protecting-local-data-on-deletes)
8. [GameLinkType and model associations](#gamelinktype-and-model-associations)
9. [Status & Winner enums](#status--winner-enums)
10. [VR API endpoints (authoritative reference)](#vr-api-endpoints-authoritative-reference)
11. [Deriving upstream state](#deriving-upstream-state)

---

## Summary

- **Upstream source**: toernooi.nl Visual Reality XML API (base `VR_API=https://api.tournamentsoftware.com/1.0`), HTTP Basic auth, 15 RPS rate-limited.
- **Invariant**: every competition encounter has exactly **8 game slots** (ordered 1–8, derived from `getAssemblyPositionsInOrder()` per team type). Slots are created by `EncounterGamesGenerationService.generateGames()`, which v1 sync now calls automatically at the top of `CompetitionSyncGameProcessor._processEncounter`.
- **Source of truth**: toernooi.nl wins **when it has real data**. Where toernooi's field is empty (unplayed game, default `Winner=0`, default `ScoreStatus=Normal` without a real outcome), local data is preserved.
- **Protection on destroy**: when an encounter is removed upstream, the local row is preserved if **any** of its games has set scores OR a non-zero winner (walkover / retirement entered locally).
- **`GameLinkType` enum** (`COMPETITION | TOURNAMENT`) replaces the magic strings throughout the backend.

---

## Components

| Component | Path |
|---|---|
| HTTP client (XML fetch + parse, rate-limited, cached) | `libs/backend/visual/src/services/visual.service.ts` |
| XML type definitions | `libs/backend/visual/src/utils/visual-result.ts` |
| v1 entry point (NestJS Bull processor on `Sync.SyncEvents`) | `apps/worker/sync/src/app/processors/sync-events/sync-events.processor.ts` |
| v1 orchestrator (chains StepProcessors) | `apps/worker/sync/src/app/processors/sync-events/competition-sync/competition-sync.ts` |
| v1 encounter step (upsert encounters + destroy missing) | `apps/worker/sync/src/app/processors/sync-events/competition-sync/processors/encounter.ts` |
| v1 game step (per-field merge + 8-slot generation) | `apps/worker/sync/src/app/processors/sync-events/competition-sync/processors/game.ts` |
| 8-slot generator | `libs/backend/competition/encounter-games/src/services/encounter-games-generation.service.ts` |
| `GameLinkType` enum | `libs/utils/src/lib/enums/gameLinkType.enum.ts` |
| Game entity + enums | `libs/backend/database/src/models/event/game.model.ts` |
| EncounterCompetition (scoped `HasMany Game`) | `libs/backend/database/src/models/event/competition/encounter-competition.model.ts` |

---

## Flow

### 1. Entry

`SyncEventsProcessor` consumes `Sync.SyncEvents` Bull jobs, opens a Sequelize transaction per XmlTournament, and hands off to `CompetitionSyncer.process()`. If the tournament's `TypeID` is `TeamTournament (1)` or `OnlineLeague (3)`, the competition chain runs; `IndividualTournament (0)` / `TeamSportTournament (2)` go to the tournament chain.

### 2. Orchestration (`CompetitionSyncer`)

Steps run sequentially inside the transaction:

```
event → subEvent → ranking → draw → entry → encounter
  → encounterLocation → player → game → point → standing → cleanup
```

All steps share the same Sequelize transaction via `this.transaction` on the `StepProcessor` base class.

### 3. Encounter step

`CompetitionSyncEncounterProcessor` fetches `TeamMatch[]` at draw level via `getGames(eventCode, drawCode)` and upserts encounters by `visualCode`. Encounters that disappeared upstream go through `_destroyEncounters` (see [protection](#protecting-local-data-on-deletes)).

### 4. Game step — per encounter

`CompetitionSyncGameProcessor._processEncounter(encounter, internalId, games)`:

1. **Ensure 8 slots exist**: call `encounterGamesGenerationService.generateGames(encounter.id, transaction)` (idempotent, skips existing orders). Reload the local games list. Skipped when `encounter.homeTeamId` is null (logged warning). Errors caught and logged — sync continues.
2. **Date guards**: skip if `isAfter(encounter.date, now)` (future) or `encounter.date == null`. Slots remain from step 1.
3. **Finished guard**: skip if `encounter.finished === true`.
4. **Fetch games**: `visualService.getTeamMatch(eventCode, internalId)` — this hits `/TeamMatch/{id}` and returns `XmlMatch[]` (individual games). Do NOT use `getGames` here: it hits `/Draw/{id}/Match` which for a team-match code returns unrelated TeamMatches.
5. **Match each `xmlMatch` to a local game** (3-level fallback):
   - (a) exact: same `order` AND same `visualCode`
   - (b) same `visualCode` only
   - (c) same `order` with null `visualCode` (local placeholder)
6. **Merge** per the policy below.

### 5. Local 8-slot generator (standalone)

`EncounterGamesGenerationService.generateGames()` is also exposed via GraphQL mutation for manual triggering. Idempotent — safe to run any number of times without duplicating slots.

---

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant Cron as Cron / Trigger
  participant SP as SyncEventsProcessor
  participant CS as CompetitionSyncer
  participant ES as EncounterStep
  participant GS as GameStep
  participant Gen as GamesGenerationService
  participant VS as VisualService
  participant VR as toernooi.nl (VR_API)
  participant DB as Database

  Cron->>SP: Sync.SyncEvents job
  SP->>DB: begin transaction
  SP->>CS: process(transaction, xmlTournament)

  CS->>ES: run encounter step
  ES->>VS: getGames(eventCode, drawCode)
  VS->>VR: GET /Draw/{drawCode}/Match
  VR-->>VS: TeamMatch[] (encounters)
  VS-->>ES: TeamMatch[]
  ES->>DB: upsert encounters; _destroyEncounters for missing (protected)

  CS->>GS: run game step

  loop per encounter
    alt encounter.homeTeamId
      GS->>Gen: generateGames(encounter.id, transaction)
      Gen->>DB: insert missing slots 1..8
      GS->>DB: reload games for encounter
    else no homeTeamId
      Note over GS: log warn, skip generation
    end

    alt future OR finished OR no date
      Note over GS: keep slots, skip merge
    else
      GS->>VS: getTeamMatch(eventCode, internalId)
      VS->>VR: GET /TeamMatch/{id}
      VR-->>VS: Match[] (individual games)
      VS-->>GS: Match[]

      loop per xmlMatch
        GS->>GS: match to local game by order+visualCode
        GS->>GS: per-field merge (see policy)
        GS->>DB: save if changed
        alt originalWinner == null
          GS->>DB: rewrite GamePlayerMemberships
        else
          Note over GS: skip membership rewrite
        end
      end
    end
  end

  SP->>DB: commit
```

---

## Merge policy (per-field)

**Rule**: toernooi.nl is the source of truth **when it has real data**. Otherwise, local data is preserved. Applied per field inside `_processEncounter` — no whole-encounter skip.

| Field | When toernooi overwrites local | When local is preserved |
|---|---|---|
| `visualCode` | local is null | local has a value (never overwritten) |
| `playedAt` | local is null | local has a date |
| `order` | local is null | local has an order |
| `round` | local is null | local has a round |
| `winner` | `xmlMatch.Winner > 0` **OR** local is null | `Winner == null` or `Winner === 0` (NOT_YET_PLAYED) |
| `set1Team1` … `set3Team2` | `xmlMatch.Sets.Set[n].TeamN != null` **OR** local is null | toernooi value is null/undefined |
| `status` | toernooi has a confirmed outcome (real `Winner > 0`) **OR** `ScoreStatus !== Normal` **OR** local is null | toernooi sent default `Normal` with no real outcome |
| `gameType`, `linkId`, `linkType` | always re-assigned, but to the same value in steady state | — |
| `GamePlayerMembership` | `originalWinner == null || originalWinner === 0` (captured **before** updates) | local game already had a winner → memberships untouched |

Why the `Winner === 0` and `ScoreStatus === Normal` exclusions exist: toernooi sends these as **defaults** for scheduled-but-unplayed games. Without the exclusion, a scheduled empty slot on toernooi would overwrite a locally-entered winner or walkover status, producing inconsistent state (scores without a winner, walkover reverted to normal).

The per-field guards are read-only-null-safe: they never overwrite local data with `null`.

---

## Slot State Matrix

Per slot, the valid states after sync are:

| State | `visualCode` | `winner` | Set scores | Meaning |
|---|---|---|---|---|
| Empty local slot | null | null | null | Created by `generateGames`, toernooi has nothing matching |
| Synced, not played | non-null | null or 0 | null | Toernooi has the slot; game not played yet |
| Synced, played | non-null | 1 or 2 | filled | Toernooi has the result |
| Locally scored | null | 1 or 2 | filled | User entered scores before toernooi caught up — protected from overwrite |
| Locally-scored + synced | non-null | 1 or 2 | filled | Slot was synced then scored locally, or scored first then matched upstream |
| Walkover / retirement | non-null or null | 1 or 2 | may be null | `status != NORMAL` or non-zero `winner` with no sets |

Total is always 8 in steady state. `generateGames` creates the missing orders; the merge loop updates them in place; no tail cleanup deletes local slots.

---

## Protecting local data on deletes

Two surfaces can delete game rows. Both now protect local entries.

### v1 `CompetitionSyncEncounterProcessor._destroyEncounters` (whole encounter removal)

Before destroying an encounter that's no longer in toernooi, the step queries for any game in the target encounter with either:

- `set1Team1 != null` OR `set1Team2 != null`, OR
- `winner != null && winner !== 0` (covers locally-entered walkovers / retirements without set scores)

Encounters with ANY such game are **skipped**, with a warning log. The remaining encounters have their games and rows destroyed.

### v1 `CompetitionSyncGameProcessor` tail cleanup — REMOVED

Previously deleted any game with `visualCode == null`. Removed in this PR — local null-`visualCode` rows are intentional slots now. Orphaned synced games (rows with stale `visualCode`) are handled at the encounter level.

---

## GameLinkType and model associations

`Game` is a polymorphic child of two parents via `(linkId, linkType)`:

- `linkType = GameLinkType.COMPETITION`, `linkId = EncounterCompetition.id` — individual games in a competition encounter
- `linkType = GameLinkType.TOURNAMENT`, `linkId = DrawTournament.id` — individual games in a tournament draw

`EncounterCompetition.@HasMany(Game)` is **scoped to `linkType = "competition"`**, so `encounter.getGames()` returns only competition games. Same pattern on `DrawTournament` scoped to `"tournament"`.

The enum replaces magic strings across:
- models, resolvers, sync v1 processors, sync v2 tournament processor, `encounter-games-generation.service.ts`, `GameBuilder` test util.

Source: `libs/utils/src/lib/enums/gameLinkType.enum.ts`.

---

## Status & Winner enums

- `GameStatus` (in `game.model.ts`): `NORMAL | WALKOVER | RETIREMENT | DISQUALIFIED | NO_MATCH`
- `XmlScoreStatus` (in `visual-result.ts`): `Normal = 0, Walkover = 1, Retirement = 2, Disqualified = 3, "No Match" = 4`
- `Winner` / `game.winner` values: `0 = NOT_YET_PLAYED, 1 = HOME_WIN, 2 = AWAY_WIN`, higher values are special outcomes mapped via `WINNER_VALUE_MAPPING` in `apps/worker/sync/src/app/utils/mapWinnerValues.ts`.

Special mapping in `game.processor.ts`: when upstream `ScoreStatus = Normal` but no scores are recorded and player fields are partially filled, the processor coerces status to `WALKOVER`.

---

## VR API endpoints (authoritative reference)

| Method | Endpoint | Returns |
|---|---|---|
| `getTournament(id)` | `GET /Tournament/{id}` | `XmlTournament` |
| `getDraws(eventCode, subEventId)` | `GET /Tournament/{evt}/Event/{sub}/Draw` | `XmlTournamentDraw[]` |
| `getGames(tourneyId, drawId)` | `GET /Tournament/{evt}/Draw/{drawId}/Match` | `XmlTeamMatch[]` for competition draws, `XmlMatch[]` for tournament draws |
| `getTeamMatch(tourneyId, matchId)` | `GET /Tournament/{evt}/TeamMatch/{id}` | `XmlMatch[]` (individual games within a competition encounter) |
| `getGame(tourneyId, matchId)` | `GET /Tournament/{evt}/MatchDetail/{id}` | `XmlMatch` (single game detail; byes excluded) |

**Common foot-gun**: `getGames` on an encounter code does NOT return the encounter's individual games — the VR API treats it as a draw lookup and returns unrelated `TeamMatch[]`. Always use `getTeamMatch` at the encounter level.

**Type normalization**: `VisualService._normalizeTypes` coerces `Code`, `ScoreStatus`, `Winner`, `MatchOrder`, `MatchTypeID` etc. to `number` at runtime. `MemberID` stays a `string`. The TypeScript interfaces in `visual-result.ts` still declare some of these as `string` (legacy) — treat the runtime shape as authoritative.

---

## Deriving upstream state

Given a DB encounter's games, these inferences are safe:

- **`visualCode` present** ⇔ game existed in toernooi at last sync.
- **No `visualCode`, no scores, no winner** ⇒ unfilled local slot (placeholder).
- **No `visualCode`, has scores or winner** ⇒ locally entered, not yet pushed to toernooi.
- **`visualCode` present, set scores + winner > 0** ⇒ played and confirmed upstream.
- **All 8 slots present, none with `visualCode`** ⇒ encounter generated locally; toernooi hasn't produced any data yet.
- **Count of games with `visualCode` < 8** ⇒ toernooi has partial data, remaining slots are local placeholders or locally scored.

To fully classify you need per-slot `visualCode`, `winner`, and set scores together.

---

## Related documents and tests

- `libs/backend/visual/src/__integration__/visual.service.integration.spec.ts` — live API contract tests (skipped without VR credentials).
- `apps/worker/sync/src/app/processors/sync-events/competition-sync/processors/__tests__/game.spec.ts` — per-field merge policy tests.
- `libs/backend/competition/encounter-games/src/services/encounter-games-generation.service.spec.ts` — 8-slot generator tests.
