# Contract: RankingPlaceWriterService

**Feature**: 037-ranking-write-protection
**Location**: `packages/backend-database/src/services/ranking-place-writer.service.ts` (`@Injectable`, registered/exported by `DatabaseModule`)

The single sanctioned write path for `RankingPlace` + `RankingLastPlace`. The external GraphQL surface does **not** change (no new/renamed mutations, no schema diff); this is an internal service contract.

## Interface

```ts
@Injectable()
export class RankingPlaceWriterService {
  /** Bulk path (publication import, CSV upload). */
  async upsertMany(
    rows: Partial<RankingPlace>[], // plain attribute objects, NOT model instances
    system: RankingSystem, // caller resolves; full row required
    opts?: {
      transaction?: Transaction;
      chunkSize?: number; // default 500
      propagateGameMemberships?: boolean; // default false (bulk import parity with old hooks)
    }
  ): Promise<{ written: number }>;

  /** Repair path (check-ranking) and targeted level updates. */
  async updateForPlayer(
    playerId: string,
    system: RankingSystem,
    levels: { single?: number; double?: number; mix?: number }, // partial OK, ≥1 required
    opts?: {
      transaction?: Transaction;
      propagateGameMemberships?: boolean; // repair path passes true
    }
  ): Promise<RankingPlace[]>; // updated rows, newest first

  /** Single-row path (GraphQL create/edit mutations, flanders service). */
  async upsertOne(
    row: Partial<RankingPlace>,
    system: RankingSystem,
    opts?: { transaction?: Transaction }
  ): Promise<RankingPlace>;

  /** Destroy + RankingLastPlace re-point (replaces AfterDestroy hook). */
  async remove(place: RankingPlace, opts?: { transaction?: Transaction }): Promise<void>;
}
```

## Behavioral guarantees

1. **Config guard**: throws (`Error`, message naming the system) when `system.amountOfLevels` or `system.maxDiffLevels` is null/undefined. No partial writes happen before the check.
2. **Fill-from-previous before derivation**, per row with any missing category, batched (≤1 extra query per chunk):
   a. value from the existing row at the same `(playerId, systemId, rankingDate)`;
   b. else the player's latest prior value for that category (RankingPlace history, falling back to RankingLastPlace);
   c. only then `getRankingProtected(row, system)` fills/clamps the rest.
   ⇒ a previously-known official value is never replaced by a derived one.
3. **Protection invariant on output**: every written row satisfies — no NULL categories; `max ≤ min + maxDiffLevels`; all `≤ amountOfLevels`.
4. **Chunked writes**: `bulkCreate` with `updateOnDuplicate` on the level/points/rank/`updatePossible` columns, `returning: false`, `hooks: false` (clamp hook redundant after step 2c), default 500-row chunks with inter-chunk delay preserved from the current import.
5. **Explicit snapshot propagation**: after each chunk, `RankingLastPlace` bulk-upserted for affected `(playerId, systemId)` pairs **only** when the incoming `rankingDate >=` the stored snapshot's date. No reliance on model hooks.
6. **Game-membership propagation** only when `propagateGameMemberships: true` (parity with the old `AfterUpdate`/`AfterUpsert` behavior — bulk import never did this).
7. **Transaction honor**: every statement uses `opts.transaction` when provided; the service never opens its own transaction when one is passed (Constitution III: mutations own the transaction).
8. **`remove`**: deletes the row and re-points `RankingLastPlace` to the next-newest remaining row (or deletes the snapshot if none), in the same transaction.

## Enforcement contract

- Root eslint `no-restricted-syntax`: `MemberExpression[object.name='RankingPlace'][property.name=/^(bulkCreate|create|upsert|findOrCreate)$/]` banned outside `ranking-place-writer.service.ts` (single inline disable there). Message points to this contract.
- Model clamp hooks (`@BeforeCreate/@BeforeUpdate/@BeforeUpsert/@BeforeBulkCreate`): clamp-only via per-process cached system lookup (5-min TTL); **warn + no-op** when the system is unresolvable or unconfigured. They are the safety net for instance `.save()` calls the lint rule cannot see.

## Invariant SQL (Release B gate + permanent data-quality check)

Run for **both** `ranking."RankingPlaces"` and `ranking."RankingLastPlaces"`; expected result: `0`.

```sql
SELECT count(*)
FROM ranking."RankingPlaces" rp
JOIN ranking."RankingSystems" s ON s.id = rp."systemId"
WHERE s."amountOfLevels" IS NOT NULL AND s."maxDiffLevels" IS NOT NULL
  AND (rp.single IS NULL OR rp.double IS NULL OR rp.mix IS NULL
   OR GREATEST(rp.single, rp.double, rp.mix)
      > LEAST(rp.single, rp.double, rp.mix) + s."maxDiffLevels"
   OR GREATEST(rp.single, rp.double, rp.mix) > s."amountOfLevels");
```

## Pre-flight SQL (before Release A)

```sql
SELECT id, name, "rankingSystem", "maxDiffLevels", "amountOfLevels"
FROM ranking."RankingSystems"
WHERE "maxDiffLevels" IS NULL OR "amountOfLevels" IS NULL;
-- any row ⇒ configure before deploying Release A
```

## Consumers (Release A refactor targets)

| Consumer                                                      | Method                                               | Notes                                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/worker/sync/.../sync-ranking/ranking-sync.ts`           | `upsertMany`                                         | replaces chunk loop; also fix `:567` (`player.playerId`) and `:553` (`transaction` out of `where`) |
| `apps/worker/sync/.../check-ranking/get-ranking.processor.ts` | `updateForPlayer` (`propagateGameMemberships: true`) | also fix dead `getViaRanking` branch; bail only on zero categories                                 |
| `packages/backend-ranking/.../update-ranking.service.ts`      | `upsertMany`                                         | system already in scope                                                                            |
| `packages/backend-graphql/.../rankingPlace.resolver.ts`       | `upsertOne` / `remove`                               | mutations keep transaction + permission checks; silent clamp semantics                             |
| `packages/backend-belgium/flanders/places/...`                | `upsertOne`                                          | consistency only; behavior unchanged                                                               |
