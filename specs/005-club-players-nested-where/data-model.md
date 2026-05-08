# Data Model: Filter Club Players by Membership Fields

**Branch**: `005-club-players-nested-where` | **Date**: 2026-04-30 (revised after BAD-132 v2)

## No schema changes (no DB migration)

GraphQL schema + resolver level only.

## Existing entities (read-only references)

### Player — `libs/backend/database/src/models/player.model.ts`
Returned by the resolver. No changes.

### ClubPlayerMembership — `libs/backend/database/src/models/club-player-membership.model.ts`
Through-model. Fields used by the filter:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Filterable via `id: [ID!]` |
| `membershipType` | enum (`NORMAL`, `LOAN`) | Filterable via `membershipType: [String!]` |
| `start` | Date | Filterable upper-bound via `startBefore: DateTime` (`start <= startBefore`) |
| `end` | Date \| null | Filterable lower-bound via `endAfter: DateTime` (`end >= endAfter`) |
| `confirmed` | boolean | Filterable via `confirmed: Boolean` (exact match) |
| `active` (virtual) | boolean | **NOT exposed** in the input (clarify Q2) |

### Club — `libs/backend/database/src/models/club.model.ts`
Owns the `players` BelongsToMany association. No changes.

## New GraphQL input type

### ClubMembershipFilterInput

File: `libs/backend/graphql/src/resolvers/club/club-membership-filter.input.ts` (NEW)

```ts
import { Field, ID, InputType } from "@nestjs/graphql";

@InputType({
  description:
    "Filter Club.players by associated ClubPlayerMembership fields. Supplying this argument (even as {}) opts the call into 'include unconfirmed memberships' behavior; omitting it preserves the legacy implicit confirmed=true filter.",
})
export class ClubMembershipFilterInput {
  @Field(() => [ID], { nullable: true, description: "Match memberships whose id is in this list (SQL IN). Empty array means 'no match'." })
  id?: string[];

  @Field(() => [String], { nullable: true, description: "Match memberships whose membershipType is in this list (SQL IN). Allowed values: NORMAL, LOAN." })
  membershipType?: string[];

  @Field(() => Date, { nullable: true, description: "Match memberships where start <= startBefore." })
  startBefore?: Date;

  @Field(() => Date, { nullable: true, description: "Match memberships where end >= endAfter (NULL end excluded). To include open-ended memberships, the caller must run a separate query or accept the exclusion." })
  endAfter?: Date;

  @Field(() => Boolean, { nullable: true, description: "Exact match on confirmed. Omit to include both confirmed and unconfirmed (when this argument is supplied at all)." })
  confirmed?: boolean;
}
```

## Resolver argument additions

`Club.players` field arg list:

```graphql
# Before
players(skip: Int, take: Int, where: JSONObject, order: [SortOrderType!], active: Boolean): [PlayerWithClubMembershipType!]!

# After
players(
  skip: Int,
  take: Int,
  where: JSONObject,
  order: [SortOrderType!],
  active: Boolean,
  clubMembership: ClubMembershipFilterInput   # ← NEW
): [PlayerWithClubMembershipType!]!
```

## Filter translation rules

For each field present on `clubMembership`, the resolver builds a Sequelize `where` object on the through-model:

| Input field | SQL where built |
|-------------|-----------------|
| `id: ["uuid-1", "uuid-2"]` | `{ [Op.in]: ["uuid-1", "uuid-2"] }` keyed by `id` |
| `id: []` | `{ [Op.in]: [] }` — Postgres `IN ()` returns zero rows; resolver may short-circuit to empty result |
| `membershipType: ["LOAN"]` | `{ [Op.in]: ["LOAN"] }` keyed by `membershipType` |
| `startBefore: <date>` | `{ [Op.lte]: <date> }` keyed by `start` |
| `endAfter: <date>` | `{ [Op.gte]: <date> }` keyed by `end` |
| `confirmed: true` | `{ [Op.eq]: true }` keyed by `confirmed` |

The combined where is attached to `include: [{ model: ClubPlayerMembership, as: 'ClubPlayerMembership', required: <bool>, where: <built> }]` in the `findAll` options. `required` toggles between `INNER` and `LEFT` JOIN per FR-008:

| `clubMembership` arg | JOIN | Implicit `confirmed=true` |
|----------------------|------|--------------------------|
| omitted | (current behavior — implicit dollar-syntax filter on through-model) | YES (preserved) |
| `{}` (empty) | `LEFT` (defensive) | NO |
| any field set | `INNER` (`required: true`) | NO |

## Implicit `confirmed = true` removal — behavioral spec

The resolver currently injects `[ $ClubPlayerMembership.confirmed$ ]: true` into `where` whenever `active=true` (default). After this change:

```ts
const opting_in = clubMembership !== undefined && clubMembership !== null;
if (active && !opting_in) {
  // legacy path — preserve today's behavior
  options.where = { ...options.where, [`$${ClubPlayerMembership.name}.confirmed$`]: true };
}
```

When `opting_in` is true, the `confirmed` filter (if any) comes solely from `clubMembership.confirmed`. If that field is omitted, no `confirmed` filter is applied.

## No state transitions

Query-side feature. No write paths or lifecycle changes.
