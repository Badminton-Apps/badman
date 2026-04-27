# Encounter Games Sync (toernooi.nl)

How encounter games are pulled from toernooi.nl (Visual Reality) into the database, and what the presence/count of games actually tells us about upstream state.

---

## Table of Contents

1. [Summary](#summary)
2. [Components](#components)
3. [Flow](#flow)
4. [Sequence Diagram](#sequence-diagram)
5. [Game Existence Matrix](#game-existence-matrix)
6. [Why Game Counts Vary (0–8+)](#why-game-counts-vary-08)
7. [Status & Winner Enums](#status--winner-enums)
8. [Deriving Upstream State](#deriving-upstream-state)

---

## Summary

- Upstream source: toernooi.nl (Visual Reality) XML API, base `VR_API`.
- Our model mirrors whatever `getGames(tourneyId, drawId)` returns — no placeholders are created from the sync side.
- Locally generated games (`visualCode = null`, 8 slots from assemblies) are protected from deletion and can coexist with synced games.
- Count per encounter can be anywhere from `0` to `8` strictly from toernooi, plus up to `8` local = theoretical max `16` if both sources populate.

---

## Components

| Component | Path |
|---|---|
| HTTP client (XML fetch + parse) | `libs/backend/visual/src/services/visual.service.ts` |
| Draw processor (encounters per draw) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/draw.processor.ts` |
| Encounter processor (games per encounter) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/encounter.processor.ts` |
| Game processor (single game detail) | `apps/worker/sync/src/app/processors/sync-events-v2/competition/processors/game.processor.ts` |
| Local 8-slot generator | `libs/backend/competition/encounter-games/src/services/encounter-games-generation.service.ts` |
| Game entity + enums | `libs/backend/database/src/models/event/game.model.ts` |
| Encounter entity | `libs/backend/database/src/models/event/competition/encounter-competition.model.ts` |

---

## Flow

### Upstream call

`VisualService.getGames(tourneyId, drawId)` — `visual.service.ts:90`

```
GET {VR_API}/Tournament/{tourneyId}/Draw/{drawId}/Match
```

Response is XML, parsed into either `Match[]` or `TeamMatch[]`. If neither key is present, the service logs `"No matches"` and returns `[]`.

### Encounter-level reconciliation

`EncounterProcessor.processGames()` — `encounter.processor.ts:186-236`

1. Fetch toernooi games: `visualService.getGames(eventCode, encounterCode)`.
2. Load DB games for the encounter.
3. For each DB game:
   - If `visualCode == null` → **skip** (local slot, never destroyed — line 207).
   - Else if its `visualCode` is not in the toernooi response → **destroy** (line 209–211).
4. For each toernooi match → queue `ProcessSyncCompetitionGame` job (one per match).

### Per-game sync

`GameProcessor` — `game.processor.ts:100-180`

1. Re-fetches the entire draw via `getGames(eventCode, draw.visualCode)` (needed because byes are absent from per-match detail endpoint).
2. Picks the match by `Code`.
3. Parses `Sets`, `MatchTime`, `ScoreStatus` → maps to `GameStatus`.
4. Creates/updates the DB `Game`, its sets, and `GamePlayerMembership` rows.
5. Player memberships only re-written if there was no prior winner (preserves historical player assignments on re-sync).

### Local 8-slot generation (independent path)

`EncounterGamesGenerationService.generateGames()` — `encounter-games-generation.service.ts:25`

- Manually triggered via GraphQL mutation (`encounter.resolver.ts:476`).
- Always creates 8 game slots per encounter (M/F: 4 doubles + 4 singles; MX: interleaved order).
- All slots are saved with `visualCode = undefined`, which is what makes them immune to sync-time deletion.

---

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant Q as Bull Queue
  participant DP as DrawProcessor
  participant EP as EncounterProcessor
  participant VS as VisualService
  participant VR as toernooi.nl (VR_API)
  participant DB as Database
  participant GP as GameProcessor

  Q->>DP: ProcessSyncCompetitionDraw
  DP->>VS: getGames(eventCode, drawCode)
  VS->>VR: GET /Tournament/{t}/Draw/{d}/Match
  VR-->>VS: XML (TeamMatch[] = encounters)
  VS-->>DP: encounters[]
  DP->>Q: queue ProcessSyncCompetitionEncounter per encounter

  Q->>EP: ProcessSyncCompetitionEncounter
  EP->>VS: getGames(eventCode, encounterCode)
  VS->>VR: GET /Tournament/{t}/Draw/{encounterCode}/Match
  VR-->>VS: XML (Match[] = games, 0..8)
  VS-->>EP: matches[]
  EP->>DB: load encounter.games
  loop for each DB game
    alt visualCode == null
      Note over EP,DB: skip — local slot, protected
    else visualCode not in matches[]
      EP->>DB: destroy game (stale upstream)
    end
  end
  loop for each match in matches[]
    EP->>Q: queue ProcessSyncCompetitionGame
  end

  Q->>GP: ProcessSyncCompetitionGame
  GP->>VS: getGames(eventCode, draw.visualCode)
  VS-->>GP: matches[] (cache likely hit)
  GP->>GP: find match by Code; map ScoreStatus → GameStatus
  GP->>DB: upsert Game + Sets + GamePlayerMembership
```

---

## Game Existence Matrix

| Upstream state in toernooi.nl | `getGames` returns | DB result (sync-only) |
|---|---|---|
| Encounter never set up / no games entered | `[]` | 0 games with `visualCode` |
| Encounter scheduled, not yet played | up to 8 `Match` entries, no scores | N with `visualCode`, status `NORMAL`, winner `NOT_YET_PLAYED` |
| Partial entry by tournament admin | fewer entries | any count `0..8` |
| Walkover / forfeit on a game | `Match` with `ScoreStatus=Walkover` | game kept, status `WALKOVER` |
| Retirement / disqualified / no-match | `Match` with matching `ScoreStatus` | game kept, mapped status |
| Game removed upstream after earlier sync | absent from new response | deleted on next encounter sync |

If local generation (`generateGames`) also ran, add up to 8 slots with `visualCode = null` on top of the above.

---

## Why Game Counts Vary (0–8+)

- **toernooi.nl is authoritative for existence.** Admins enter games manually per encounter; until entered, a game is not in the response.
- **No upstream placeholders.** There is no "empty slot" concept from toernooi — only materialized matches.
- **We mirror faithfully.** `encounter.processor.ts:209` deletes any DB game whose `visualCode` vanished from the response.
- **Local slots are additive.** The 8-slot generator writes games with `visualCode = null`; they survive sync regardless of upstream state.
- **Net count** at any time = (games currently in toernooi response) + (locally-generated slots not yet replaced).

---

## Status & Winner Enums

`game.model.ts` / mapped in `game.processor.ts:148`:

- `GameStatus`: `NORMAL | WALKOVER | RETIREMENT | DISQUALIFIED | NO_MATCH`
- Winner: `NOT_YET_PLAYED(0) | HOME_WIN(1) | AWAY_WIN(2) | FORFEIT | DISQUALIFIED | ABSENT`

Special mapping in `game.processor.ts:162-179`: when upstream `ScoreStatus = Normal` but no scores exist and not both teams are empty, we coerce to `WALKOVER` (workaround for tournaments that don't configure score status).

---

## Deriving Upstream State

Given a DB encounter, these inferences are safe:

- **Has `visualCode`** on game ⇔ game existed in toernooi at last sync.
- **No `visualCode`** on game ⇔ locally generated slot; tells us nothing about toernooi.
- **`visualCode` present but game missing on re-sync** ⇒ upstream admin deleted the game (we purge).
- **0 games with `visualCode`** ⇒ either (a) admin never created any, or (b) they were all deleted, or (c) encounter is a bye — cannot distinguish from count alone.
- **Game count < 8 with `visualCode`s** ⇒ admin only configured those; the missing ones are not present upstream (not the same as "forfeit" — for forfeit they'd exist with `Walkover` status).

To fully classify an encounter's upstream state you need both the game count **and** the per-game `ScoreStatus` — not count alone.
