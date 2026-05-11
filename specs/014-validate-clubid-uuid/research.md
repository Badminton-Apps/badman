# Phase 0 Research: Validate `clubId` as UUID at mutation boundary

No `NEEDS CLARIFICATION` markers came out of the spec. The decisions below were resolved during planning and are documented here so the implementation has a single anchor.

## Decision 1: Where validation runs — resolver entry, not GraphQL scalar

- **Decision**: Validate `clubId` (and `id` for Club-targeted mutations) inline at the top of each resolver method, via a shared `assertUUID(value, field, ctx)` helper.
- **Rationale**:
  - The GraphQL `ID` scalar is intentionally permissive — it's a serialized string with no syntactic constraint. Tightening the scalar globally would also constrain hundreds of other `ID` args (teamId, playerId, …) which are out of scope for this feature; some legitimately accept UUID-or-slug.
  - A NestJS `ValidationPipe` with `class-validator` decorators is the alternative for scalar-level enforcement, but it requires every `@Args` to be wrapped in an `@InputType()` class. The existing mutations take primitive args (`@Args("clubId", { type: () => ID })`), so converting them all would be a much larger surface change with cross-cutting test fallout.
  - The resolver-inline call is one line, follows the repo's existing classified-error pattern (throw `GraphQLError` with `extensions.code`), and is trivially testable per the resolver-test discipline.
- **Alternatives considered**:
  - Custom `UUIDID` scalar — discarded: same problem, every callsite changes, type-safety doesn't improve materially.
  - Validation in `submit-enrollment.service.ts` — discarded: services should stay free of `GraphQLError`. Raising at the service produces an inconsistent error shape for the same logical fault.
  - Defer validation until `Club.findByPk` returns null and surface as `CLUB_NOT_FOUND` — discarded: that's the current behavior for non-UUID inputs only when the cast happens to succeed (it doesn't for slugs), and it can't protect the advisory-lock invariant of `recalculateTeamNumbersForGroup`.

## Decision 2: Error code — new `BAD_USER_INPUT` constant

- **Decision**: Add `BAD_USER_INPUT = "BAD_USER_INPUT"` to `libs/backend/graphql/src/utils/error-codes.ts`. The error message includes the offending field name and value.
- **Rationale**:
  - The repo's resolver pattern (CLAUDE.md, principle III area) requires every classified error to be a named constant. Inline string literals are forbidden because clients pin behavior to these codes.
  - `BAD_USER_INPUT` matches Apollo's well-known code (`apollo-server-errors`' `UserInputError` emits `BAD_USER_INPUT`); using the same string keeps client-side handling idiomatic and discoverable.
- **Alternatives considered**:
  - Reusing `CLUB_NOT_FOUND` — discarded: different semantic (the input was malformed, not "unknown but well-formed").
  - Adding a more specific `INVALID_UUID` — discarded: too narrow; future input-validation features (e.g. season range, type enum) want the same code.

## Decision 3: Validation runs before authorization

- **Decision**: `assertUUID` runs at the very top of the mutation, before `user.hasAnyPermission(...)`.
- **Rationale**:
  - A non-UUID can never satisfy a permission scope of the form `${clubId}_edit:club` (the scope string would have to be `smash-for-fun_edit:club` and no such grant is ever issued). So validation-first cannot leak information about whether the slug *would* have matched a real club.
  - Failing fast saves the permission-table lookup on bad input and produces a cleaner error path (`BAD_USER_INPUT` is more actionable than `PERMISSION_DENIED` for a debugging frontend developer).
- **Alternatives considered**:
  - Validation after auth (the "auth first" reflex) — discarded for the reasons above.

## Decision 4: UUID validator — `uuid` package (`validate as isUUID`)

- **Decision**: Use `validate` from the existing `uuid` package, imported as `isUUID`.
- **Rationale**:
  - Already a transitive dep in `apps/api`'s graph. Zero new dependency.
  - The same import is used in `club.resolver.ts` for the read-side branch, keeping conventions identical across the file.
  - `class-validator`'s `IsUUID` decorator is the alternative, but it ships as a decorator, not a function — wrong shape for an inline check.
- **Alternatives considered**:
  - Hand-rolled regex (`/^[0-9a-f-]{36}$/i`) — discarded: imprecise (accepts non-hex hyphenated strings), bypasses canonical version-byte checks.

## Decision 5: Read-side `club(id: ...)` stays untouched

- **Decision**: `clubs.club(id)` keeps its existing `IsUUID(id) ? findByPk : findOne({ where: { slug } })` dual-resolution.
- **Rationale**: It's a query, not a mutation. There is no advisory-lock invariant. Slug is the natural URL identifier, and the frontend uses this exact query to translate slug → UUID once before invoking the now-strict mutations. Removing the dual resolution would break the very mechanism that lets the frontend comply with the new strictness cheaply.

## Decision 6: Scope — Club-scoped mutations only, this PR

- **Decision**: Out of scope this PR: `teamId`, `playerId`, `encounterId`, `subEventId`, and any other entity-id args. Future PRs may apply the same helper.
- **Rationale**: We are fixing the observed Postgres log and the latent advisory-lock risk. Tightening every entity arg in one PR widens the blast radius and the review burden without addressing a known incident. The helper is generic — those PRs become one-line changes per resolver.
