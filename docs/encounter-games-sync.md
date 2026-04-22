# Encounter Games Sync (toernooi.nl)

How encounter games are pulled from toernooi.nl (Visual Reality) into the database, how they interact with locally-generated placeholders, and how the "always 8 games per encounter" invariant is enforced.

---

## Table of Contents

1. [Summary](#summary)
2. [Components](#components)
3. [Flow](#flow)
4. [Sequence Diagram](#sequence-diagram)
5. [Slot State Matrix](#slot-state-matrix)
6. [Score Conflict Resolution](#score-conflict-resolution)
7. [Status & Winner Enums](#status--winner-enums)
8. [Deriving Upstream State](#deriving-upstream-state)

---

## Summary

- Upstream source: toernooi.nl (Visual Reality) XML API, base `VR_API`.
- Every competition encounter has **exactly 8 game slots** (ordered 1–8, derived from `getAssemblyPositionsInOrder()`).
- Slots are created by `EncounterGamesGenerationService.generateGames()`, which is now called automatically at the start of every encounter sync (was previously a manual GraphQL mutation only).
- Toernooi data merges **in place** into existing local slots (matched by `order` = `MatchOrder`). Local games with set scores are protected and are never overwritten.
- `GameLinkType` enum distinguishes `COMPETITION` (encounter games) from `TOURNAMENT` (tournament draw games). Competition games always have `linkId = encounter.id` / `linkType = "competition"`.

---

## Components

| Component | Path |
|---|---|
| HTTP client (XML fetch + parse) | `libs/backend/visual/src/services/visual.service.ts` |
| Draw processor (encounters per draw) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/draw.processor.ts` |
| Encounter processor (games per encounter) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/encounter.processor.ts` |
| Game processor (single game detail) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/game.processor.ts` |
| Local 8-slot generator | `libs/backend/competition/encounter-games/src/services/encounter-games-generation.service.ts` |
| `GameLinkType` enum | `libs/utils/src/lib/enums/gameLinkType.enum.ts` |
| Game entity + enums | `libs/backend/database/src/models/event/game.model.ts` |
| Encounter entity | `libs/backend/database/src/models/event/competition/encounter-competition.model.ts` |

---

## Flow

### 1. Upstream call

`VisualService.getGames(tourneyId, drawId)` — `visual.service.ts:90`

```
GET {VR_API}/Tournament/{tourneyId}/Draw/{drawId}/Match
```

Response is XML, parsed into either `Match[]` (individual games) or `TeamMatch[]` (encounters). The API returns `Match[]` when `drawId` is an **encounter code**, and `TeamMatch[]` when it's a **draw code**. If neither key is present, the service logs `"No matches"` and returns `[]`.

### 2. Encounter sync — ensure 8 slots exist

`EncounterCompetitionProcessor.ProcessSyncCompetitionEncounter` — `encounter.processor.ts`

After the `EncounterCompetition` row is saved, `generateGames(encounter.id, transaction)` runs unconditionally. It is idempotent: skips any `order` (1–8) already present. So on first sync all 8 slots are created, and on re-syncs it's a no-op.

### 3. Encounter sync — reconciliation

`EncounterCompetitionProcessor.processGames` — `encounter.processor.ts:196+`

1. Fetch toernooi games: `visualService.getGames(eventCode, encounterVisualCode)` → `XmlMatch[]`.
2. Load DB games for the encounter via `encounter.getGames()` (scoped to `linkType = 'competition'`).
3. Walk DB games:
   - **Local placeholder** (no `visualCode`): match to a toernooi entry by `order == MatchOrder`.
     - If local slot has set scores (`set1Team1 != null || set1Team2 != null`) → protect it; the toernooi match is added to `skipCodes` and its game job is NOT queued.
     - Otherwise → record the local game's `id` in `localGameIdByOrder`; a game job will be queued and will update the local game **in place** (same UUID, stamps `visualCode`, scores, players).
   - **Synced game** (has `visualCode`): if its code is missing from the current toernooi response, destroy (stale upstream).
4. Queue a `ProcessSyncCompetitionGame` job per non-skipped toernooi match, passing:
   - `gameId` = local placeholder's id if one matched that slot, else the id of a previously-synced game with that visualCode, else none (new game created in game processor)
   - `encounterId`, `encounterVisualCode`, `drawId`, `eventCode`, `rankingSystemId`, `gameCode`, `options`.

### 4. Per-game sync

`GameCompetitionProcessor.ProcessSyncCompetitionGame` — `game.processor.ts`

1. Load `Game` by `gameId` if provided (this is the local placeholder in the normal path).
2. Derive `encounterId` from `job.data.encounterId ?? game.linkId`.
3. Re-fetch via `visualService.getGames(eventCode, encounterVisualCode)` — for competition we must use the encounter code, not the draw code, because the draw endpoint returns `TeamMatch[]` (encounters), not individual games.
4. Locate the match by `gameCode`; parse `Sets`, `MatchTime`, `ScoreStatus` → `GameStatus`.
5. Update the game row:
   - `linkId = encounterId`, `linkType = GameLinkType.COMPETITION` (always).
   - `round`, `order`, `playedAt` only written when the DB value is null — preserves local slot order and any pre-existing data.
   - `winner` only written when toernooi has data OR DB value is null.
   - Set scores only written when toernooi has data OR DB value is null.
   - `gameType`, `visualCode`, `status` always overwritten from toernooi.
6. Player memberships only re-written if the game had no prior winner (preserves historical assignments on re-sync).

### 5. Delete-encounter path

`encounter.processor.ts` `deleteEncounter` branch:

When an encounter is destroyed as part of sync (`options.deleteEncounter`), games are walked first. Games with set scores are **kept** (they remain linked to the old encounter UUID, which is re-used for the new `EncounterCompetition`). Unscored games are destroyed.

### 6. Local generation (standalone)

`EncounterGamesGenerationService.generateGames()` is still exposed via GraphQL mutation for manual triggering (`encounter.resolver.ts`). It uses the same idempotency logic: skip any `order` already present. Running it outside of sync is safe and produces no duplicates.

---

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant Q as Bull Queue
  participant DP as DrawProcessor
  participant EP as EncounterProcessor
  participant GS as GamesGenerationService
  participant VS as VisualService
  participant VR as toernooi.nl (VR_API)
  participant DB as Database
  participant GP as GameProcessor

  Q->>DP: ProcessSyncCompetitionDraw
  DP->>VS: getGames(eventCode, drawCode)
  VS->>VR: GET /Tournament/{t}/Draw/{drawCode}/Match
  VR-->>VS: XML (TeamMatch[] = encounters)
  VS-->>DP: encounters[]
  DP->>Q: queue ProcessSyncCompetitionEncounter per encounter

  Q->>EP: ProcessSyncCompetitionEncounter
  EP->>DB: save encounter
  EP->>GS: generateGames(encounter.id)
  GS->>DB: upsert missing slots (1..8)
  EP->>VS: getGames(eventCode, encounterVisualCode)
  VS->>VR: GET /Tournament/{t}/Draw/{encounterVisualCode}/Match
  VR-->>VS: XML (Match[] = games, 0..8)
  VS-->>EP: matches[]
  EP->>DB: load encounter.games (all 8 slots + any previously synced)

  loop for each DB game
    alt no visualCode (local slot)
      alt local slot has set scores & toernooi has match for this order
        Note over EP: add match.Code to skipCodes — protect local score
      else local slot unscored & toernooi has match
        Note over EP: record local.id in localGameIdByOrder — merge in place
      end
    else has visualCode (previously synced)
      alt visualCode missing from toernooi response
        EP->>DB: destroy game (stale upstream)
      end
    end
  end

  loop for each match not in skipCodes
    EP->>Q: queue ProcessSyncCompetitionGame (gameId = local slot id if any)
  end

  Q->>GP: ProcessSyncCompetitionGame
  GP->>VS: getGames(eventCode, encounterVisualCode)
  VS-->>GP: matches[] (cache likely hit)
  GP->>GP: pick match by gameCode; map ScoreStatus → GameStatus
  GP->>DB: update Game in place (linkId=encounterId, linkType=COMPETITION, stamp visualCode/scores/players)
```

---

## Slot State Matrix

Every encounter has exactly 8 slots after sync. Per slot, the possible states are:

| State | `visualCode` | Set scores | Meaning |
|---|---|---|---|
| Local placeholder, unfilled | null | null | generateGames created it, toernooi has no entry for this order yet |
| Toernooi-synced, no scores | set | null | Game exists upstream, not yet played or entered |
| Toernooi-synced, played | set | filled | Game played; scores and winner from toernooi |
| Local scores (protected) | null | filled | Scores entered locally before toernooi had them — protected from overwrite |
| Walkover / retirement / etc. | set | may be null | Toernooi `ScoreStatus` translated to DB `GameStatus` |

Total is always 8 (guaranteed by `generateGames()` running at sync start and the in-place merge keeping count constant).

---

## Score Conflict Resolution

When toernooi returns a game for a slot where the local game already has set scores:

- Local game: kept exactly as-is (no update).
- Toernooi match: **not** queued as a game job. `visualCode` is NOT stamped onto the local game.
- Rationale: local scores are assumed to be authoritative (typically entered by referee/team captain at the venue before toernooi was updated).

Trade-off: because `visualCode` is not stamped, the slot will be re-evaluated on the next sync. If toernooi has since updated, the protection kicks in again as long as local scores remain.

---

## Status & Winner Enums

`game.model.ts` / mapped in `game.processor.ts`:

- `GameStatus`: `NORMAL | WALKOVER | RETIREMENT | DISQUALIFIED | NO_MATCH`
- Winner: `NOT_YET_PLAYED(0) | HOME_WIN(1) | AWAY_WIN(2) | FORFEIT | DISQUALIFIED | ABSENT`

Special mapping: when upstream `ScoreStatus = Normal` but no scores exist and player fields are partially filled, game status is coerced to `WALKOVER` (workaround for tournaments that don't configure score status explicitly).

---

## Deriving Upstream State

Given a DB encounter, these inferences are safe:

- **Has `visualCode`** on game ⇔ game existed in toernooi at last sync.
- **No `visualCode`** on game ⇔ local slot. Either never synced from toernooi, or scored locally and protected.
- **`visualCode` present but game missing on re-sync** ⇒ upstream admin deleted it (we purge and re-create as a local slot via `generateGames`).
- **Count of games with `visualCode` < 8** ⇒ either toernooi doesn't have those games yet, or those slots had local scores that got protected. Check set scores on the no-`visualCode` slots to disambiguate.
- **All 8 games have `visualCode` and scores** ⇒ encounter is fully played and synced.

To fully classify an encounter's state you need both the per-slot `visualCode` presence **and** whether each slot has set scores.
