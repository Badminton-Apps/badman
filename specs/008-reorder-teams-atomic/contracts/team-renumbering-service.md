# Contract: `TeamRenumberingService`

Internal NestJS service. Backs the `recalculateTeamNumbersForGroup` mutation. Not exposed via GraphQL directly. Co-located with the team resolver.

## Location

```text
libs/backend/graphql/src/resolvers/team/team-renumbering.service.ts
```

Registered as a provider in `team.module.ts` so `TeamRenumberResolver` can inject it.

## Public surface

```ts
export interface RecalculateForScopeArgs {
  clubId: string;
  season: number;
  /**
   * Ordered list of types this call should renumber. Order matters: it
   * defines the tier order (NATIONAL first, then MX, when pooled).
   * Examples:
   *   [M], [F], [NATIONAL], [MX]                       — single-tier scope
   *   [NATIONAL, MX]                                    — pooled MX+NAT, NATIONAL takes 1..K
   */
  types: SubEventTypeEnum[];
  transaction: Transaction;
}

export interface RenumberedTeam {
  team: Team;        // the persisted instance after save (or unchanged if no change)
  changed: boolean;  // true iff the row was written this call
}

@Injectable()
export class TeamRenumberingService {
  /**
   * Recompute teamNumber / name / abbreviation for every team in the scope.
   * Tiered: types[0] takes slots 1..N0, types[1] takes N0+1..N0+N1, etc.
   * Within each tier, sort by ascending baseIndex; tie-break by Team.id.
   * Persists only teams whose number actually changes. Idempotent.
   *
   * MUST be called inside an open Sequelize transaction; the caller passes
   * it in. The service takes a postgres advisory transaction lock keyed on
   * the canonical scope key, so concurrent calls against overlapping scopes
   * serialize.
   *
   * Throws on unrecoverable internal errors (missing primary RankingSystem,
   * DB error). Does NOT throw a TEAM_NUMBER_CONFLICT.
   */
  async recalculateForScope(args: RecalculateForScopeArgs): Promise<RenumberedTeam[]>;
}
```

## Preconditions

- Caller has already validated authorization for the affected club (the resolver did this; the service does NOT re-check).
- `transaction` is open and not yet committed.
- The primary `RankingSystem` row exists.
- `args.types` is non-empty and contains only valid `SubEventTypeEnum` values.

## Postconditions (success)

- For every team in the scope, `teamNumber` equals its 1-based position in the tiered ordering described above.
- Every team whose number changed has its `name` and `abbreviation` regenerated via the `Team` model's `generateName` / `generateAbbreviation` helpers (triggered by the `BeforeUpdate` hook on the row save).
- No team in the scope has `_temp` in `name` or `abbreviation`.
- The advisory lock is released at transaction commit/rollback by the caller.
- Return value lists every team in the scope (whether changed or not), in final order matching `types[0], types[1], …` and within-tier `baseIndex ASC, id ASC`.

## Postconditions (failure)

- The caller's transaction is left as-is (the service does not call `rollback`); the caller's enclosing `try/catch` handles cleanup. Same convention as the existing resolvers.
- No partial scope state is observable to other transactions because the advisory lock plus the unstoppped transaction keep all writes invisible until the caller's commit.

## Algorithm

```text
1. Compute scopeKey from `types`:
     types is exactly [M] | [F]                  → scopeKey = types[0]
     types is exactly [MX]                       → scopeKey = 'MX'
     types is exactly [NATIONAL]                 → scopeKey = 'MX+NAT'
     types is exactly [NATIONAL, MX]             → scopeKey = 'MX+NAT'
     anything else                               → throw INTERNAL_ERROR (unsupported scope shape)

2. SELECT pg_advisory_xact_lock(hashtextextended(
        'teams_renumber:' || $clubId || ':' || $season || ':' || $scopeKey, 0));

3. teamsByTier = []
   FOR each tierType in types:
     teamsByTier.push(
       Team.findAll({
         where: { clubId, season, type: tierType },
         include: [{ model: TeamPlayerMembership, as: 'memberships', include: [Player] }],
         transaction,
         order: [['id', 'ASC']],
       })
     )

4. If every tier is empty → return [].

5. system = RankingSystem.findOne({ where: { primary: true }, transaction });
   If !system → throw INTERNAL_ERROR.

6. Build the union of base-member player ids across every tier.
   rankings = RankingLastPlace.findAll({
     where: { playerId: { [Op.in]: unionPlayerIds }, systemId: system.id },
     transaction,
   });
   (One query for the entire scope to avoid N+1.)

7. For each team in every tier:
     basePlayers = team.memberships filtered to base-set memberships (membershipType marker).
     indexPlayers = basePlayers.map(m => ({
       id: m.player.id,
       gender: m.player.gender,
       single: rankings.find(r => r.playerId === m.player.id)?.single ?? defaultRanking,
       double: ...,
       mix: ...,
     }));
     team._baseIndex = getIndexFromPlayers(team.type, indexPlayers, system.amountOfLevels);

8. Sort each tier in place by (_baseIndex ASC, id ASC).

9. nextSlot = 1;
   results = []
   FOR each tier in teamsByTier (in order):
     FOR each team in tier:
       desired = nextSlot;
       changed = team.teamNumber !== desired;
       if (changed) {
         team.teamNumber = desired;
         await team.save({ transaction });   // BeforeUpdate hook regenerates name + abbreviation
       }
       results.push({ team, changed });
       nextSlot += 1;

10. return results.
```

## Error modes

| Condition | Outcome |
|-----------|---------|
| `args.types` is empty or has unsupported shape (e.g. `[MX, NATIONAL]` reversed, or a 3-element list) | Throws `GraphQLError` with `extensions.code = INTERNAL_ERROR`. |
| Primary `RankingSystem` row missing | Throws `GraphQLError` with `extensions.code = INTERNAL_ERROR`. |
| DB error during advisory-lock acquire / `findAll` / `save` | Bubbles up; caller's transaction rolls back. |
| `getIndexFromPlayers` throws | Bubbles up; caller's transaction rolls back. (Recent change a1cbb5c44 removed the most common throw path; service is defensive against future changes.) |

The service NEVER throws `TEAM_NUMBER_CONFLICT`.

## Caller integration

Only `TeamRenumberResolver.recalculateTeamNumbersForGroup` calls this service. Other resolvers (`updateTeam`, `createTeam`, `createTeams`, `deleteTeam`) MUST NOT call it. The wizard / FE drives recalculation explicitly.

If a future code path needs to renumber (e.g. an admin tool that imports a season's teams and wants to normalize), it injects `TeamRenumberingService` and calls `recalculateForScope` directly inside its own transaction. The advisory lock protects it against concurrent wizard calls.

## What the service does NOT do

- Re-check authorization. The resolver is the boundary.
- Open or commit a transaction. The caller owns it.
- Touch any row outside the requested scope.
- Touch `EventEntry`, `TeamPlayerMembership`, or any other related table — only `Team`'s three fields (`teamNumber`, `name`, `abbreviation`) via `Team.save`.
- Emit i18n strings or user-facing messages.
