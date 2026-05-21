# Phase 1 — Internal Data Model

This feature touches no persistent data and adds no Sequelize models or GraphQL `@ObjectType` declarations. The "data model" below is the **internal type model** of the rewritten service.

## Internal types

### Before (current state, to be deleted)

```ts
type Batch<K, V> = {
  keys: Set<K>;
  promise: Promise<Map<K, V>> | null;
};

type BatchState<K, V> = {
  cache: Map<K, V | null>;
  batch: Batch<K, V> | null;
};

// + five fields of type BatchState<...> on the service
// + a 30-line generic loadOne() helper
```

### After (rewritten internals)

```ts
import DataLoader from "dataloader";

private readonly captainLoader: DataLoader<string, Player | null>;
private readonly locationLoader: DataLoader<string, Location | null>;
private readonly clubLoader: DataLoader<string, Club | null>;
private readonly entryLoader: DataLoader<string, EventEntry | null>;
private readonly playersLoader: DataLoader<string, Player[]>;
```

All five fields are initialised either in the constructor or as class field initialisers; same lifetime as the service instance (request-scoped).

## Persistent entities referenced (unchanged)

The five loaders read these existing Sequelize models without modification:

- [`Player`](libs/backend/database/src/models/player.model.ts) — looked up by `id` and by `TeamPlayerMembership.playerId`.
- [`Location`](libs/backend/database/src/models/location.model.ts) — looked up by `id`.
- [`Club`](libs/backend/database/src/models/club.model.ts) — looked up by `id`.
- [`EventEntry`](libs/backend/database/src/models/event/event-entry.model.ts) — looked up by `teamId`. Selection rule: prefer `drawId IS NOT NULL`, else first.
- [`TeamPlayerMembership`](libs/backend/database/src/models/team-player-membership.model.ts) — joined onto Player to fetch a team's players. Attached to each returned `Player` as `player.TeamPlayerMembership`.
- [`Team`](libs/backend/database/src/models/team.model.ts) — the parent in every resolver call. Read fields: `id`, `captainId`, `prefferedLocationId`, `clubId`.

No schema changes, no new associations, no new indexes.

## Public method signatures (unchanged contract)

The class's public surface — the only thing `TeamsResolver` sees — does not change.

| Method | Signature | Behaviour |
|--------|-----------|-----------|
| `getCaptain` | `(team: Team) => Promise<Player \| null>` | `team.captainId ?? null` short-circuit; otherwise loader. |
| `getPrefferedLocation` | `(team: Team) => Promise<Location \| null>` | Same shape. |
| `getClub` | `(team: Team) => Promise<Club \| null>` | Same shape. |
| `getEntry` | `(team: Team) => Promise<EventEntry \| null>` | `team.id` keyed; preserves drawId fallback. |
| `getPlayers` | `(team: Team) => Promise<Player[]>` | `team.id` keyed; returns `[]` for unknown teams; attaches `TeamPlayerMembership` per player. |

Reference: [team-association.service.ts](libs/backend/graphql/src/resolvers/team/team-association.service.ts).
