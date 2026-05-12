# Contract: Club-scoped mutation input policy

The cross-resolver rule that defines which mutations are tightened and how.

## Rule

Every GraphQL mutation whose first DB action is `Club.findByPk(arg)` MUST validate that `arg` is a UUID by calling `assertUUID(arg, "<argName>", { userId })` as its very first statement (before any try / transaction / permission check / logger).

The validation MUST run before the authorization check. Per the research decision: a non-UUID cannot match `${clubId}_edit:club`, so there is no information-leak surface.

The read-side `club(id: ...)` query is explicitly excluded — it dual-resolves UUID-or-slug by design and is the mechanism callers use to translate slug → UUID once.

## Inventory (this PR's scope)

| File | Line range | Resolver method | Validated arg |
|---|---|---|---|
| `libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts` | ~30–60 | `recalculateTeamNumbersForGroup` | `clubId` |
| `libs/backend/graphql/src/resolvers/team/team.resolver.ts` | ~170–190 | `createTeam` | `clubId` |
| `libs/backend/graphql/src/resolvers/team/team.resolver.ts` | ~215–240 | `createTeams` | `clubId` |
| `libs/backend/graphql/src/resolvers/club/club.resolver.ts` | ~228–245 | `removeClub` | `id` |
| `libs/backend/graphql/src/resolvers/club/club.resolver.ts` | ~256–290 | `updateClub` | `updateClubData.id` |
| `libs/backend/graphql/src/resolvers/club/club.resolver.ts` | ~305–325 | `addPlayerToClub` | `addPlayerToClubData.clubId` |
| `libs/backend/graphql/src/resolvers/location/location.resolver.ts` | ~75–100 | `addLocation` | `newLocationData.clubId` |
| `libs/backend/graphql/src/resolvers/event/entry.resolver.ts` | ~125–145 | (clubId-bearing entry mutation) | `clubId` |
| `libs/backend/graphql/src/resolvers/event/entry.resolver.ts` | ~135–150 | (clubId-bearing entry mutation) | `clubId` |

Line ranges are approximate at the time of planning; the implementation uses `findByPk` calls as the authoritative anchor — wherever a `Club.findByPk(x)` appears in a mutation resolver in `libs/backend/graphql/src/`, it gets a matching `assertUUID(x, "<field>", { userId })` at the top of that resolver method.

`submit-enrollment.service.ts:144` is NOT validated in the service — the resolver that invokes it must run the validation at its boundary so the failure surfaces at the GraphQL layer with the standard shape.

## What stays as-is

- `libs/backend/graphql/src/resolvers/club/club.resolver.ts` lines 58–73 (`club(id)` read query) — UUID-or-slug dual resolution preserved.
- All other entity-id arguments across the backend (`teamId`, `playerId`, `encounterId`, …) — explicitly out of scope. The helper is generic and can be applied in follow-up PRs.

## Error shape (caller-visible)

Per the `assertUUID` helper contract:

```json
{
  "errors": [
    {
      "message": "clubId must be a UUID, got: \"smash-for-fun\"",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "clubId",
        "value": "smash-for-fun",
        "userId": "<caller-uuid-or-null>"
      }
    }
  ]
}
```

Clients SHOULD pin behavior to `extensions.code`. They MAY use `extensions.field` to point at a form field. They MUST NOT match on `message` (which is debug copy and may change).

## Migration note for callers

The new Next.js frontend currently passes `clubId: route.params.clubSlug` in some places. After this PR ships, those calls will fail with `BAD_USER_INPUT`. The corrective pattern is to resolve the UUID once via the existing read query and reuse it:

```ts
const { data } = await apolloClient.query({
  query: gql`query ClubBySlug($id: ID!) { club(id: $id) { id } }`,
  variables: { id: clubSlug },
  fetchPolicy: "cache-first",
});
const clubId = data.club.id;
```

Apollo's cache makes subsequent calls free. This change is tracked in `specs/008-reorder-teams-atomic/frontend-impact.md`.
