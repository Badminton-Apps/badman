# Research: Filter Club Players by Membership Fields

**Branch**: `005-club-players-nested-where` | **Date**: 2026-05-01 (revised after BAD-132 v3)

## Finding 1: Current `Club.players` resolver shape

`libs/backend/graphql/src/resolvers/club/club.resolver.ts:92–147`. Resolves `[PlayerWithClubMembershipType]`. Args today:
- `@Args() listArgs: ListArgs` — paged where/order/skip/take. `where` is `JSONObject` after `queryFixer()`.
- `@Args("active", { defaultValue: true }) active`. When `true`, injects `$ClubPlayerMembership.confirmed$ = true` into `where`.

**Decision**: Add a third arg `clubMembership: ClubMembershipFilterInput` (optional). When supplied, suppress the `active`-derived `confirmed` injection; build a typed where on the through-model and attach via `include`.

## Finding 2: Typed-input shape (BAD-132 v3)

The original spec planned `JSONObject` operator maps per field. BAD-132 v2 superseded that with concrete typed fields. BAD-132 v3 adds an explicit transfer-loading use case (`membershipType: NORMAL, confirmed: false`) as the canonical frontend pattern for identifying "transfers added during this enrollment session":

- `id: [ID!]` and `membershipType: [String!]` → SQL `IN`
- `startBefore: DateTime` → `start <= startBefore`
- `endAfter: DateTime` → `end >= endAfter`
- `confirmed: Boolean` → exact match (load-bearing for US2: `confirmed: false` filters to transfer-only rows)

**Decision**: Adopt verbatim. The `confirmed: false` + date-range combination is the primary transfer-loading pattern. The `id` field remains in the schema for future use but is no longer a primary user story.

**Trade-off**: New operators (e.g. `between`, `not in`) require schema additions, not just new operator constants. Acceptable — the field set is small and stable.

## Finding 3: Implicit `confirmed = true` removal — opt-in via arg presence

This is the load-bearing rule for BAD-120. Today every `Club.players` call gets `confirmed: true` injected (when `active=true` which is the default). BAD-120 persists transfers/loans with `confirmed: false`; today's resolver hides them.

**Decision**: Use **arg presence as the opt-in signal**. If `clubMembership` is supplied (even as `{}`), the implicit filter is dropped. If omitted, current behavior is preserved.

**Why this design**: Backwards compat. Every existing caller (`SearchClubPlayers`, team-composition, etc.) is unchanged. Only callers that pass the new arg get the new behavior. Step-3 `SearchClubPlayers` will be updated in the frontend to pass `clubMembership: {}` to opt in to surfacing unconfirmed members.

**Alternatives considered**:
- A new `includeUnconfirmed: Boolean` flag — explicit but easier to forget. Two args (`active` + `includeUnconfirmed`) for related concerns is confusing.
- Removing `active` entirely — breaking change to existing callers.
- Always filter unconfirmed — would surface unconfirmed memberships in places that don't want them.

## Finding 4: JOIN strategy — INNER vs LEFT

BAD-132 v3 specifies:
- Any `clubMembership` field set → `INNER JOIN` (`required: true`)
- `clubMembership: {}` → `LEFT JOIN` (`required: false`) "defensive — if relationship is one-to-one and required, INNER is fine, but verify"

**Decision**: Use `INNER` when any field is set, `LEFT` for empty `{}`. The `Club ↔ Player` association via `ClubPlayerMembership` is one-to-many (a player can belong to multiple clubs over time), so a player-without-membership row to this club shouldn't exist. The LEFT JOIN for `{}` is defensive but harmless.

**Verification needed during implementation**: Confirm that `LEFT JOIN` doesn't produce duplicate `Player` rows when a player has multiple membership rows (it shouldn't, because we're going `Club → through → Player` not `Player → through`). The existing `distinctPlayers` filter at line 143–148 already guards against duplicates.

## Finding 5: `include` shape with Sequelize BelongsToMany

`Club.getPlayers(options)` accepts `options.include` to add nested where on the through-model. With `BelongsToMany`, the through-model is auto-included by Sequelize when its association alias is referenced. The pattern is:

```ts
options.include = [
  ...(options.include ?? []),
  {
    model: ClubPlayerMembership,
    as: 'ClubPlayerMembership',  // verified alias from dollar-syntax usage in the resolver
    required: <bool>,
    where: <built>,
  },
];
```

**Decision**: Build the `include` entry inside the resolver. The association alias `ClubPlayerMembership` is verified from the existing dollar-syntax key `$ClubPlayerMembership.confirmed$` in the resolver today.

## Finding 6: `id: []` (empty array) handling

Postgres `WHERE id IN ()` is a syntax error (some Sequelize versions short-circuit, some emit `IN (NULL)`). Empty array intent is ambiguous: "match nothing" vs "match everything".

**Decision**: Treat `id: []` as "match nothing" → return empty list. Implementation: short-circuit before building the include if `clubMembership.id` is an empty array. Document in the input field description so frontend doesn't accidentally rely on it.

## Finding 7: `endAfter` and NULL `end` (open-ended memberships)

Memberships with `end IS NULL` are open-ended (still active). `end >= endAfter` excludes NULLs. BAD-132 v3 acknowledges this and explicitly does NOT add a synthetic operator for it.

**Decision**: Document the exclusion in the field description. Frontend can either accept the exclusion or run a second query for open-ended rows. **No `$or` magic on the backend** — keep the input semantics unambiguous.

## Finding 8: N+1 prevention

Sequelize emits a single SELECT with one JOIN when `getPlayers(options)` is called with `include`. Existing impl already does this. Adding a `where` clause to the include doesn't change the query count.

**Decision**: No additional work for FR-009. Add a test that asserts `Sequelize.prototype.query` is called exactly once for a multi-row result.

## Finding 9: Test pattern

Reference: `team.resolver.spec.ts` and `enrollmentSetting.resolver.spec.ts`. New `club.resolver.spec.ts` if absent (or extend if 004's tests merged first).

**Cases for `players` field** (BAD-132 v3):

1. No `clubMembership` arg → `getPlayers` called with the `active`-derived `$confirmed$ = true` (legacy path).
2. `clubMembership: {}` → no `confirmed` filter; `include` has `required: false` (LEFT).
3. `clubMembership: { membershipType: ["LOAN"] }` → `include` has `required: true` (INNER) and `where: { membershipType: { [Op.in]: ["LOAN"] } }`.
4. `clubMembership: { startBefore: "2026-04-30", endAfter: "2025-09-01" }` → `where: { start: { [Op.lte]: ... }, end: { [Op.gte]: ... } }`.
5. `clubMembership: { confirmed: false }` → `where: { confirmed: false }`; legacy `confirmed=true` not injected.
6. `clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: <date>, endAfter: <date> }` → `where` has `membershipType IN`, `confirmed: false`, `start: { [Op.lte] }`, `end: { [Op.gte] }` (US2 transfer-loading pattern).
7. `clubMembership: { id: [] }` → returns `[]` without calling `getPlayers` (short-circuit).
8. `clubMembership: { id: ["a","b"] }` combined with player-level `where: { firstName: { $eq: "Anna" } }` → both filter sets present.
9. Single-query assertion: spy on `Sequelize.prototype.query`, expect 1 call.

## Finding 10: GraphQL schema delta summary

```graphql
input ClubMembershipFilterInput {
  id:             [ID!]
  membershipType: [String!]
  startBefore:    DateTime
  endAfter:       DateTime
  confirmed:      Boolean
}

# Club.players signature:
players(
  skip: Int,
  take: Int,
  where: JSONObject,
  order: [SortOrderType!],
  active: Boolean,
  clubMembership: ClubMembershipFilterInput   # NEW
): [PlayerWithClubMembershipType!]!
```

**Decision**: New `@InputType` lives at `libs/backend/graphql/src/resolvers/club/club-membership-filter.input.ts`. Field-level descriptions per data-model.md.
