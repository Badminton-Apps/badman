# Contract: `recalculateTeamNumbersForGroup` GraphQL mutation

The single explicit GraphQL mutation that owns numbering writes. The ONLY path that writes `Team.teamNumber`, `Team.name`, or `Team.abbreviation` going forward.

## Location

```text
libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts
```

Hosted on a separate `@Resolver` class (not the existing `TeamsResolver`) to keep the recalculate's dependencies (the renumbering service) isolated and to make the resolver-pattern tests trivially focused.

## SDL

```graphql
type Mutation {
  recalculateTeamNumbersForGroup(
    clubId: ID!
    season: Int!
    type: SubEventTypeEnum!
    nationalCountsAsMixed: Boolean = false
  ): RecalculateTeamNumbersResult!
}

type RecalculateTeamNumbersResult {
  """The teams in the affected scope, in their final 1..N order."""
  teams: [Team!]!
  """The scope this call wrote to. types is [type] for non-pooled, [MX, NATIONAL] for pooled MX+NAT."""
  affectedScope: RecalculateAffectedScope!
}

type RecalculateAffectedScope {
  clubId: ID!
  season: Int!
  types: [SubEventTypeEnum!]!
}
```

`SubEventTypeEnum` is the existing enum (`M | F | MX | NATIONAL`). `Team` is the existing model-as-objecttype.

## Code-first declaration sketch

```ts
@ObjectType("RecalculateAffectedScope")
class RecalculateAffectedScope {
  @Field(() => ID) clubId!: string;
  @Field(() => Int) season!: number;
  @Field(() => [SubEventTypeEnum]) types!: SubEventTypeEnum[];
}

@ObjectType("RecalculateTeamNumbersResult")
class RecalculateTeamNumbersResult {
  @Field(() => [Team]) teams!: Team[];
  @Field(() => RecalculateAffectedScope) affectedScope!: RecalculateAffectedScope;
}

@Resolver()
export class TeamRenumberResolver {
  constructor(
    private readonly _sequelize: Sequelize,
    private readonly _renumber: TeamRenumberingService,
  ) {}

  @Mutation(() => RecalculateTeamNumbersResult, {
    description:
      "Recompute teamNumber / name / abbreviation for every team in the affected scope. " +
      "When nationalCountsAsMixed is true and type is MX, the scope is the pooled NATIONAL+MX set " +
      "for that (clubId, season): NATIONAL teams take slots 1..K (sorted by baseIndex), MX teams " +
      "take K+1..K+M (sorted by baseIndex). This mutation is the only path that writes those three " +
      "fields. Mid-season callers MUST NOT call it; team numbers are intended to be frozen for the " +
      "season once enrollment closes.",
  })
  async recalculateTeamNumbersForGroup(
    @Args("clubId", { type: () => ID }) clubId: string,
    @Args("season", { type: () => Int }) season: number,
    @Args("type", { type: () => SubEventTypeEnum }) type: SubEventTypeEnum,
    @Args("nationalCountsAsMixed", { type: () => Boolean, defaultValue: false })
    nationalCountsAsMixed: boolean,
    @User() user: Player,
  ): Promise<RecalculateTeamNumbersResult> { ... }
}
```

## Authorization

- Caller MUST hold `<clubId>_edit:club` OR `edit-any:club`.
- The check runs against `clubId` BEFORE any write or any advisory-lock acquire.
- Failure → `GraphQLError` with `extensions.code = "PERMISSION_DENIED"`, `extensions.userId`, `extensions.clubId`. No write.

## Behavior (success)

1. Look up the `Club` by `clubId`. Not found → `CLUB_NOT_FOUND`.
2. Open a Sequelize transaction.
3. Acquire `pg_advisory_xact_lock` on the canonical scope key (see "Lock key" below).
4. Resolve the affected scope into a list of types:
   - `type ∈ { M, F }` → scope types = `[type]`.
   - `type = NATIONAL` → scope types = `[NATIONAL]`. (The lock key is `'MX+NAT'` regardless — see "Lock key".)
   - `type = MX` and `nationalCountsAsMixed = false` → scope types = `[MX]`.
   - `type = MX` and `nationalCountsAsMixed = true` → scope types = `[NATIONAL, MX]` (NATIONAL first, MX second; ordering matters for FR-002 tiered numbering).
5. Delegate to `TeamRenumberingService.recalculateForScope({ clubId, season, types: scope, transaction })`.
6. The service: loads teams in the scope (one query per type, ordered by `id`); loads `RankingLastPlace` for the union of base-member player ids; loads the primary `RankingSystem`; computes `baseIndex` per team; sorts within each tier by `(baseIndex ASC, id ASC)`; assigns `teamNumber` cumulatively across tiers in the order specified by `scope`; saves only changed rows; returns the team list in final order.
7. Commit. Return `{ teams, affectedScope: { clubId, season, types: scope } }`.

## Behavior (idempotent)

If the scope is already correctly numbered, step 6 saves zero rows. The mutation still returns the (unchanged) teams in their current order. Same return shape as a write-effecting call. No error.

## Behavior (failure)

| Condition | Error code | Side effect |
|-----------|-----------|-------------|
| Caller lacks club-edit permission | `PERMISSION_DENIED` | Transaction never opened (or rolled back at the boundary). No write. |
| `clubId` does not match a club | `CLUB_NOT_FOUND` | Rollback. No write. |
| Primary `RankingSystem` row missing | `INTERNAL_ERROR` | Rollback. No write. |
| DB error (lock acquire, query, save) | `INTERNAL_ERROR` | Rollback. No write. |
| `getIndexFromPlayers` throws | `INTERNAL_ERROR` | Rollback. No write. (Defensive — current main makes this case unreachable.) |
| Two recalculate calls race for the same scope | The second blocks on the advisory lock until the first commits, then proceeds. Neither errors. | Both eventually succeed, both visible to subsequent reads. |

The mutation NEVER raises `TEAM_NUMBER_CONFLICT`.

## Lock key

```text
scopeKey =
  type ∈ { M, F }  →  type
  type = NATIONAL  →  'MX+NAT'
  type = MX,  nationalCountsAsMixed = false  →  'MX'
  type = MX,  nationalCountsAsMixed = true   →  'MX+NAT'

lockKey = hashtextextended('teams_renumber:' || clubId || ':' || season || ':' || scopeKey, 0)
```

The `'MX+NAT'` collision for both NATIONAL-only and MX-pooled calls is intentional: any two calls that could touch NATIONAL teams in the same `(clubId, season)` must serialize.

## Idempotency / replay

Calling the mutation N times in a row with the same inputs produces the same final state. The first call may write rows; subsequent calls write zero rows and return the same result. Safe under wizard-side retries, "save again" buttons, and React StrictMode double-fires.

## Concurrency contract

Two callers invoking the mutation against the same `(clubId, season, scopeKey)` serialize via the advisory lock. The second call sees the first call's writes after it commits. The result returned to each caller reflects the persisted state at its own commit time.

Two callers invoking the mutation against different scopes (different club, different season, different scopeKey) execute in parallel without contention.

## Telemetry

Resolver logs: on entry, `info` with `{ clubId, season, type, nationalCountsAsMixed, userId }`. On error, `warn`/`error` with the error code and the same context. On success, `debug` with `{ teamsChanged: <count> }`. Reuses the existing `Logger` instance pattern from `team.resolver.ts`.

## Out of scope for this contract

- Pagination — affected scopes are bounded (≤50 teams), so the result list is returned in full.
- Subscriptions / pushed updates — none. The wizard polls / refetches via the existing `teams(...)` query if it wants neighbors of the affected scope.
- `T` cross-type moves — not handled by the recalculate. `updateTeam` of a team's `type` is out of scope; if the wizard supports such a move, it must call the recalculate for both old and new scopes.
