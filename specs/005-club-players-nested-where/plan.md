# Implementation Plan: Filter Club Players by Membership Fields

**Branch**: `005-club-players-nested-where` | **Date**: 2026-05-01 (revised after BAD-132 v3) | **Spec**: [spec.md](spec.md)

## Summary

Add a typed `clubMembership: ClubMembershipFilterInput` argument to the `Club.players` resolve field. Fields are concrete typed (no `JSONObject` operator maps): `id: [ID!]`, `membershipType: [String!]` → `IN`; `startBefore: DateTime` → `start <=`; `endAfter: DateTime` → `end >=`; `confirmed: Boolean` → exact match. Translation goes through Sequelize `include` with `INNER` JOIN (`required: true`) when any field is set, `LEFT` JOIN when arg is `{}`. **Critical behavioral rule**: when the arg is supplied at all, the legacy implicit `confirmed = true` filter (currently injected by the `active` arg) is suppressed — this is the load-bearing change for BAD-120's enrollment flow which persists transfers/loans with `confirmed: false`. Existing callers that omit the arg get identical behavior to today.

## Technical Context

**Language/Version**: TypeScript (Node.js 20, Nx monorepo)
**Primary Dependencies**: NestJS, Sequelize + sequelize-typescript, Apollo GraphQL
**Storage**: PostgreSQL — `ClubPlayerMembership` table in `public` schema
**Testing**: Jest via Nx (`nx test backend-graphql`)
**Target Platform**: Node.js API server (port 5010)
**Project Type**: NestJS Nx monorepo — `@badman/backend-graphql` only
**Performance Goals**: One SQL query per resolver call (FR-009).
**Constraints**: No DB schema changes. Backward-compatible: callers without `clubMembership` arg behave exactly as today (implicit `confirmed = true` preserved).
**Scale/Scope**: One resolver field touched + one new input type + tests.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code-First GraphQL via Sequelize Models | PASS | New `@InputType` `ClubMembershipFilterInput` is a thin filter container; references the existing through-model. No duplicate entity. |
| II. Translation Discipline | PASS | No i18n changes. |
| III. Transactional Mutations | N/A | Query field. |
| IV. Resolver Test Discipline | REQUIRES WORK | New tests added covering FR-001..FR-010. |
| V. Legacy Frontend Boundary | PASS | No frontend changes. |

No violations.

## Project Structure

### Documentation

```text
specs/005-club-players-nested-where/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings (revised)
├── data-model.md        ← Phase 1 input type + translation rules (revised)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
libs/backend/graphql/src/resolvers/club/
├── club-membership-filter.input.ts    ← NEW @InputType
├── club.resolver.ts                   ← extend players() resolve field
├── club.module.ts                     ← (likely auto-discovered, verify)
└── club.resolver.spec.ts              ← NEW or extend with players() filter cases
```

## Phase 0: Research (complete)

See [research.md](research.md). Key decisions:

1. Typed input fields (no operator maps), pre-baked semantics per field name.
2. Arg presence as opt-in signal — supplying `clubMembership` (even `{}`) drops the implicit `confirmed = true` filter.
3. `INNER JOIN` when any filter field set; `LEFT JOIN` for empty `{}`.
4. `id: []` short-circuits to empty result.
5. `endAfter` excludes NULL `end` (open-ended memberships) — caller's responsibility.
6. `active` virtual not exposed.

## Phase 1: Design & Contracts

See [data-model.md](data-model.md). No DB changes.

### GraphQL contract delta

```graphql
input ClubMembershipFilterInput {
  id:             [ID!]
  membershipType: [String!]
  startBefore:    DateTime
  endAfter:       DateTime
  confirmed:      Boolean
}

type Club {
  players(
    skip: Int,
    take: Int,
    where: JSONObject,
    order: [SortOrderType!],
    active: Boolean,
    clubMembership: ClubMembershipFilterInput   # NEW
  ): [PlayerWithClubMembershipType!]!
}
```

### Behavioral table (from data-model.md)

| `clubMembership` arg | `confirmed` field | Filter applied | JOIN |
|----------------------|-------------------|----------------|------|
| omitted | n/a | implicit `confirmed = true` (legacy preserved) | (current path) |
| `{}` | omitted | no `confirmed` filter | LEFT |
| any field set, `confirmed` omitted | omitted | no `confirmed` filter | INNER |
| any field set, `confirmed: true` | `true` | `confirmed = true` | INNER |
| any field set, `confirmed: false` | `false` | `confirmed = false` | INNER |

### Implementation steps (ordered)

#### Step 1 — Create `ClubMembershipFilterInput`

**File**: `libs/backend/graphql/src/resolvers/club/club-membership-filter.input.ts` (NEW)

Per data-model.md "New GraphQL input type". Five typed fields. Field-level descriptions explaining `startBefore`/`endAfter` semantics and the `endAfter` NULL-end exclusion.

#### Step 2 — Extend `Club.players` resolver

**File**: `libs/backend/graphql/src/resolvers/club/club.resolver.ts:92`

Add the new arg:

```ts
@Args("clubMembership", { type: () => ClubMembershipFilterInput, nullable: true })
clubMembership?: ClubMembershipFilterInput,
```

Build the through-model where + include:

```ts
const optingIn = clubMembership !== undefined && clubMembership !== null;

if (optingIn) {
  // Empty array on `id` means "match nothing" — short-circuit
  if (clubMembership.id !== undefined && clubMembership.id.length === 0) {
    return [];
  }

  const membershipWhere: Record<string, unknown> = {};
  if (clubMembership.id?.length) {
    membershipWhere.id = { [Op.in]: clubMembership.id };
  }
  if (clubMembership.membershipType?.length) {
    membershipWhere.membershipType = { [Op.in]: clubMembership.membershipType };
  }
  if (clubMembership.startBefore !== undefined) {
    membershipWhere.start = { [Op.lte]: clubMembership.startBefore };
  }
  if (clubMembership.endAfter !== undefined) {
    membershipWhere.end = { [Op.gte]: clubMembership.endAfter };
  }
  if (clubMembership.confirmed !== undefined) {
    membershipWhere.confirmed = clubMembership.confirmed;
  }

  const anyFieldSet = Object.keys(membershipWhere).length > 0;

  options.include = [
    ...(options.include ?? []),
    {
      model: ClubPlayerMembership,
      as: "ClubPlayerMembership", // verified alias — see club.model.ts:124–126
      required: anyFieldSet, // INNER when any field set; LEFT for `{}`
      where: anyFieldSet ? membershipWhere : undefined,
    },
  ];
}
```

Adjust the `active=true` branch to skip when opting in:

```ts
if (active && !optingIn) {
  // Legacy path — preserve today's behavior for callers that don't pass the arg
  options.where = {
    ...options.where,
    [`$${ClubPlayerMembership.name}.confirmed$`]: true,
  };
}
```

(The original `active`-branch had commented-out time-bounded filters; leave them commented exactly as today. They are not part of this fix.)

#### Step 3 — Module registration

**File**: `libs/backend/graphql/src/resolvers/club/club.module.ts`

NestJS code-first auto-discovers `@InputType` classes via the resolver's import statement. The new file is referenced by `club.resolver.ts` — that's enough. Verify `nx build api` succeeds. If a type-not-registered error surfaces, follow the precedent for other input types in the codebase.

#### Step 4 — Tests

**File**: `libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts`

If the file exists from spec 004 (depends on merge state), append cases. Otherwise create following `team.resolver.spec.ts` pattern.

Mock setup:

```ts
const fakeClub = {
  getPlayers: jest.fn().mockResolvedValue([fakePlayer1, fakePlayer2]),
} as unknown as Club;
jest.spyOn(Club, "findByPk").mockResolvedValue(fakeClub);
```

Cases:

1. **No `clubMembership` arg, `active=true`** → `getPlayers` called once; `where` includes `$ClubPlayerMembership.confirmed$ = true`; no `include` for through-model added.
2. **`clubMembership: {}`** → `where` does NOT include `$confirmed$`; `include` present with `required: false`.
3. **`clubMembership: { membershipType: ["LOAN"] }`** → `include` has `required: true` and `where.membershipType: { [Op.in]: ["LOAN"] }`.
4. **`clubMembership: { startBefore: <date>, endAfter: <date> }`** → `include.where` has both `start: { [Op.lte] }` and `end: { [Op.gte] }`.
5. **`clubMembership: { confirmed: false }`** → `include.where.confirmed === false`; legacy `$confirmed$=true` not injected.
6. **`clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: <date>, endAfter: <date> }`** → `include.where` has `membershipType IN`, `confirmed: false`, `start: { [Op.lte] }`, `end: { [Op.gte] }`.
7. **`clubMembership: { id: [] }`** → returns `[]` immediately; `getPlayers` not called.
8. **`clubMembership: { id: ["a","b"] }` + `where: { firstName: { $eq: "Anna" } }`** → both filter sets present in the call.
9. **Single-query assertion** — spy `Sequelize.prototype.query`, expect exactly 1 call for a multi-row result.

#### Step 5 — Polish

- `nx test backend-graphql` — must pass (existing + new cases)
- `nx lint backend-graphql` — must pass
- `nx build backend-graphql` and `nx build api` — must compile
- Manual probe: with API running, call `players(clubMembership: {})` against a club known to have unconfirmed memberships (e.g. `4699bcdd-f6db-48ea-81aa-f79acdf47a7c` per BAD-132 references); verify count grows vs. `players()` without the arg.

## Quickstart

After this lands, BAD-120 frontend queries become:

```graphql
# Load LOAN memberships for the current enrollment season (incl. unconfirmed)
query GetClubLoans($clubId: ID!, $startBefore: DateTime!, $endAfter: DateTime!) {
  club(id: $clubId) {
    id
    players(clubMembership: {
      membershipType: ["LOAN"]
      startBefore: $startBefore
      endAfter: $endAfter
    }) {
      id memberId firstName lastName fullName gender
      clubMembership { id membershipType start end confirmed }
    }
  }
}

# Load unconfirmed NORMAL (transfer) memberships for the current enrollment season
query GetClubTransfers($clubId: ID!, $startBefore: DateTime!, $endAfter: DateTime!) {
  club(id: $clubId) {
    id
    players(clubMembership: {
      membershipType: ["NORMAL"]
      confirmed: false
      startBefore: $startBefore
      endAfter: $endAfter
    }) {
      id memberId firstName lastName fullName gender
      clubMembership { id membershipType start end confirmed }
    }
  }
}

# Step-3 SearchClubPlayers — opts in to "include unconfirmed" via empty {}
query SearchClubPlayers($clubId: ID!, $where: JSONObject) {
  club(id: $clubId) {
    id
    players(where: $where, clubMembership: {}) {
      id memberId firstName lastName fullName gender
      clubMembership { id membershipType start end confirmed }
    }
  }
}
```

Frontend `getSeasonPeriod(season)` from `utils/date.utils.ts:13` provides the `startBefore`/`endAfter` ISO values.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
