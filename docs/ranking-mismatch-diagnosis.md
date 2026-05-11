# Diagnosing a single-player ranking mismatch

When a client reports that a specific player's level in Badman differs from what they see on `toernooi.nl`, work through this playbook before assuming a sync bug. Most mismatches resolve to either federation data sparsity or a different federation web view (live vs publication-based).

## 1. Get the right info from the client

Ask for **all three**:

1. **Federation member ID** (numeric, e.g. `50108141`) — visible on the federation profile.
2. **The exact URL** the client looked at. The URL tells you which federation view they used:
   - `https://badvla.tournamentsoftware.com/player-profile/<UUID>` and `…/player-profile/<UUID>/ranking` → **live player profile**. Federation derives a current ranking that includes inactive-player downgrades. This value can differ from any single per-pub record and is **not what our sync pulls**.
   - `https://badvla.tournamentsoftware.com/ranking/category.aspx?…` (or similar `/ranking/…` paths listing many players) → **publication-based ranking** (per-pub archive). Should match our `RankingPlace` for the same pub date.
3. **A screenshot or the exact numbers** — `single` / `double` / `mix` they see, with the date or "as of today".

Without the URL, you cannot tell if a mismatch is real or expected (live-vs-pub).

## 2. Map federation ID to local UUID

```sql
SELECT id, "memberId", "visualPlayer", "firstName", "lastName"
FROM "Players"
WHERE "memberId" = '<FED_ID>';
```

Note both `id` (local UUID) and `visualPlayer` (federation Visual UUID) — the latter is what the federation API uses.

## 3. Pull the player's recent ranking history

```sql
SELECT
  rp."rankingDate"::date,
  rp."single",  rp."singleInactive",  rp."singlePointsDowngrade",  rp."singlePoints",
  rp."double",  rp."doubleInactive",  rp."doublePointsDowngrade",  rp."doublePoints",
  rp."mix",     rp."mixInactive",     rp."mixPointsDowngrade",     rp."mixPoints"
FROM ranking."RankingPlaces" rp
JOIN "Players" p ON p.id = rp."playerId"
WHERE p."memberId" = '<FED_ID>'
  AND rp."systemId" = '<SYSTEM_ID>'
ORDER BY rp."rankingDate" DESC
LIMIT 12;
```

And compare against the `RankingLastPlace` snapshot (what the app actually displays):

```sql
SELECT
  lp."rankingDate"::date,
  lp."single", lp."single Inactive" AS si, lp."singlePoints",
  lp."double", lp."doubleInactive"  AS di, lp."doublePoints",
  lp."mix",    lp."mixInactive"     AS mi, lp."mixPoints"
FROM ranking."RankingLastPlaces" lp
JOIN "Players" p ON p.id = lp."playerId"
WHERE p."memberId" = '<FED_ID>'
  AND lp."systemId" = '<SYSTEM_ID>';
```

## 4. Interpret

### NULL category at recent pubs

If `mix` (or `single` / `double`) shows `NULL` at the latest pub but a non-NULL value at an older pub, federation simply did not publish that player in that category. `RankingLastPlace` keeps the last non-NULL value — see [docs/ranking-sync-recovery.md](./ranking-sync-recovery.md) (Federation NULL pattern). This is correct behavior, not a bug.

Examples that look "wrong" but are not:
- Player has weekly `mix=5` rows, then `NULL` at the latest two pubs. `RankingLastPlace.mix = 5`. Federation web profile may show `3` because federation's live calc demoted them between pubs.
- Player has `single=3` consistently, then disappears from `RankingPlaces` entirely for the last 4 weeks. `RankingLastPlace.single = 3` indefinitely. Likely the player was deregistered or moved clubs and federation stopped publishing them.

### Levels diverge AND `RankingPlace` row exists at the disputed date

```sql
-- Does our row at the disputed pub date match the federation web value?
SELECT "rankingDate"::date, "single", "double", "mix", "updatedAt"
FROM ranking."RankingPlaces"
WHERE "playerId" = '<UUID>'
  AND "systemId" = '<SYSTEM_ID>'
  AND "rankingDate" = '<DISPUTED_DATE UTC>';
```

| Our value | Client URL | Cause | Fix |
|---|---|---|---|
| matches client | `…/ranking/category.aspx` | Already aligned — display read path issue (cache? wrong field?) | Investigate frontend |
| differs from client | `…/ranking/category.aspx` | Sync wrote stale federation data OR local recalc overwrote | Re-fire targeted `Sync.SyncRanking` for that date |
| differs from client | `…/player-profile/<UUID>/ranking` | Federation live ranking ≠ pub-archive ranking | Outside our control; explain to client or sync the live endpoint (separate work) |

### `updatedAt` later than your last sync

A subsequent job overwrote the row. Almost always `UpdateRanking` running with the watermark behind the latest fed pub date. See [docs/ranking-sync-recovery.md](./ranking-sync-recovery.md) Phase 3 caveat — UpdateRanking writes local levels at boundary dates that coincide with fed pub dates. Re-fire `Sync.SyncRanking` over that window to overwrite.

## 5. Spot-check raw federation API

If `category.aspx` vs our DB still diverges, hit the federation API directly to see what it returns now. Compare against our row's values.

```bash
curl -H 'X-Api-Key: <key>' \
  -H 'Accept: application/json' \
  'https://api.tournamentsoftware.com/1.0/Player/<VISUAL_PLAYER_UUID>/Ranking'
```

Or the per-pub category endpoint that sync uses:

```bash
curl -H 'X-Api-Key: <key>' \
  -H 'Accept: application/json' \
  'https://api.tournamentsoftware.com/1.0/Ranking/<RANKING_VISUAL_CODE>/Publication/<PUB_CODE>/Category/<CAT_CODE>'
```

Find the member ID in the response and read `Level` / `Totalpoints` / `Rank`. Three outcomes:

- API matches our DB and differs from web → federation web uses a different endpoint or live calc. Not our bug.
- API matches the client's value → our DB is stale. Re-fire `Sync.SyncRanking` for the affected window.
- API differs from both → federation server-side data quality issue. File a ticket with the federation.

## Closed case: Liam Bauwens (`memberId=50108141`) — 2026-05-11

**Client URL:** `https://badvla.tournamentsoftware.com/player-profile/47337AB6-1C56-4F18-9558-8B3E5E80D68F/ranking`

= live player profile, not per-pub archive.

**Values on federation profile:** `single=3 (743 pts)`, `double=1 (1509 pts)`, `mix=3 (no points)`.

**Values in our DB (`RankingLastPlace`):** `single=3 (743)`, `double=1 (1509)`, `mix=4 (0)`.

| Category | Match? | Reason |
|---|---|---|
| Single | ✓ | per-pub matches live |
| Double | ✓ | per-pub matches live |
| Mix | ✗ | DB carries `4` from 2026-05-03 (May update boundary, demoted 5 → 4). Per-pub archive returns `NULL` at 04-26 and 05-10. Federation live profile derives `3` from its own inactive-player downgrade calc — this `3` exists only in the live profile, never in any per-pub record. |

**Resolution:** expected divergence between federation live profile and per-pub archive. Not a sync bug, not fixable without syncing a different federation endpoint. Explain to client: per-pub archive matches; live profile differs because Liam has no recent mix activity and federation's live calc downgrades him further than the last published pub.

**If we ever want to fix this for the whole player base:** introduce a separate sync that reads the federation player-profile endpoint and stores its values alongside the per-pub data. Separate model column (e.g. `RankingLastPlace.mixLive`) or separate table. Out of scope for the current sync recovery effort.
