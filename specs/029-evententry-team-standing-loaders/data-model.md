# Data Model — EventEntry Team & Standing Loaders

No schema changes. No new persistent entities. This document records the existing entities the loaders read and the new in-memory service introduced.

## Entities (read-only)

### EventEntry — [libs/backend/database/src/models/event/entry.model.ts](../../libs/backend/database/src/models/event/entry.model.ts)

- Schema: `event.Entries`
- Relevant fields used by this feature:
  - `id: UUID` — primary key, used as the standing batch key
  - `teamId: UUID | null` — FK to `Team.id`, used as the team batch key
- Associations: `@HasOne(() => Standing)` (entry.model.ts:171); `@BelongsTo(() => Team, 'teamId')`.

### Team — [libs/backend/database/src/models/team.model.ts](../../libs/backend/database/src/models/team.model.ts)

- Schema: `public.Teams`
- Lookup: by primary key `id`.
- Behavior in this feature: unchanged. Batched read replaces N single-row reads.

### Standing — [libs/backend/database/src/models/event/standing.model.ts](../../libs/backend/database/src/models/event/standing.model.ts)

- Schema: `event.Standings`
- Lookup key for this feature: `entryId` (FK to `EventEntry.id`), confirmed at [standing.model.ts:44-47](../../libs/backend/database/src/models/event/standing.model.ts#L44-L47).
- Cardinality: effectively 1:1 with `EventEntry` (Sequelize `HasOne`).

## New in-memory service

### `StandingLoaderService`

- Path: `libs/backend/graphql/src/loaders/standing-loader.service.ts` (NEW)
- Lifecycle: `@Injectable({ scope: Scope.REQUEST })` — new instance per GraphQL request, discarded at request end. No persistence, no cross-request cache.
- API:
  - `load(entryId: string | null | undefined): Promise<Standing | null>` — returns the entry's standing, or `null` if `entryId` is falsy or no row exists.
- Internal batcher: `Standing.findAll({ where: { entryId: { [Op.in]: [...ids] } } })`; result indexed by `entryId`; missing ids resolve to `null`.

## Validation rules

No new validation. Existing model-level constraints unchanged.

## State transitions

None. Read-only feature.

## Relationships diagram (existing)

```text
EventEntry ──(teamId, BelongsTo)──> Team
EventEntry ──(entryId on Standing, HasOne)──> Standing
```

The loaders walk these two edges in batch, replacing per-row Sequelize association mixin calls (`getTeam`, `getStanding`).
