# Contract — `TeamAssociationService` public API

This document pins the observable behaviour of `TeamAssociationService` that consumers (currently only `TeamsResolver`) depend on. The refactor in feature 019 **MUST NOT** alter any of the contract items below.

## Lifecycle

- `@Injectable({ scope: Scope.REQUEST })` — one instance per GraphQL request.
- Instance is created lazily on first injection; destroyed when the request ends.
- No global state. No shared cache across requests.

## Method contracts

### `getCaptain(team: Team): Promise<Player | null>`

| Input | Output |
|-------|--------|
| `team.captainId === null \| undefined` | resolves to `null` synchronously (no DB query) |
| `team.captainId === "p1"` (exists) | resolves to the `Player` row with id `"p1"` |
| `team.captainId === "missing"` (no row) | resolves to `null` |
| Two `Team`s share the same captainId in one tick | one DB query, both callers receive the same row |

### `getPrefferedLocation(team: Team): Promise<Location | null>`

Same shape as `getCaptain`, keyed on `team.prefferedLocationId`, returning `Location`.

### `getClub(team: Team): Promise<Club | null>`

Same shape as `getCaptain`, keyed on `team.clubId`, returning `Club`. Note this is the same id for many teams of one club; expect heavy dedup in `GetClubTeams`.

### `getEntry(team: Team): Promise<EventEntry | null>`

| Input | Output |
|-------|--------|
| Team has no `EventEntry` row | resolves to `null` |
| Team has exactly one `EventEntry` | resolves to that entry |
| Team has multiple `EventEntry` rows, at least one with `drawId !== null` | resolves to the first such drawId-bearing entry |
| Team has multiple `EventEntry` rows, all with `drawId === null` | resolves to the first row returned by the batch query |

### `getPlayers(team: Team): Promise<Player[]>`

| Input | Output |
|-------|--------|
| Team has no `TeamPlayerMembership` rows | resolves to `[]` |
| Team has membership rows for players A, B | resolves to `[A, B]` (order matches DB result) |
| Each returned `Player` | has `player.TeamPlayerMembership` set to the corresponding membership row |

## Batching guarantees

- All `getX(team)` calls dispatched within the same JavaScript microtask are batched into **one** SQL query per loader.
- Subsequent ticks (e.g. nested resolver fields that resolve serially) start fresh batches.
- Cache scope: per-instance (per-request). A `team.id` requested twice in the same request triggers one DB query.

## Error semantics

- If the underlying `findAll` throws, every `.load(key)` Promise for that batch rejects with the same error.
- Errors propagate as-is — no swallow, no wrap.

## What is NOT promised

- No guarantee about SQL query ordering (e.g. which loader fires first).
- No guarantee about cache survival across requests (intentional).
- No public access to the underlying DataLoader instances; callers MUST go through the five methods above.

## Verification

The existing spec [team-association.service.spec.ts](libs/backend/graphql/src/resolvers/team/team-association.service.spec.ts) covers each row in the tables above. Any change to the file's behaviour that breaks one of these assertions is a contract violation and MUST be reverted before merge.
