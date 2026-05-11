# Feature Specification: Validate `clubId` as UUID at mutation boundary

**Feature Branch**: `014-validate-clubid-uuid`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Enforce UUID validation on Club-scoped GraphQL mutation `clubId`/`id` arguments to prevent slug-as-UUID Postgres 22P02 cast errors and protect the `recalculateTeamNumbersForGroup` advisory-lock invariant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Recalculate-numbers caller passes a slug, gets a clean error (Priority: P1)

A frontend developer wires the team-number recalculate action into the club page. The route gives them the club **slug** (`smash-for-fun`). They pass it directly into the mutation. Today this surfaces as an opaque server error and pollutes Postgres logs with `invalid input syntax for type uuid: "smash-for-fun"`. After this feature, the caller receives a clean, classified GraphQL error that names the bad argument, the bad value, and the required shape. The recalculate mutation never opens a transaction, never touches the advisory lock, and never reaches Postgres.

**Why this priority**: This is the immediate observed failure in production logs and the most dangerous one, because the recalculate's correctness depends on its advisory-lock key being keyed on the canonical UUID. A caller using a slug would not just fail loudly — it would silently bypass serialization against UUID-keyed callers if any cast succeeded. Fixing this also gives the new frontend a clear contract while it stabilizes.

**Independent Test**: Invoke `recalculateTeamNumbersForGroup(clubId: "smash-for-fun", ...)` against a running API. Verify the GraphQL response carries a single error with a machine-readable `BAD_USER_INPUT` code and no Postgres log entry for that request.

**Acceptance Scenarios**:

1. **Given** a caller authenticated as a club admin, **When** they invoke a Club-scoped mutation with a `clubId` that is not a UUID, **Then** the server responds with a GraphQL error whose `extensions.code = "BAD_USER_INPUT"` and names the offending field and value, and the database is not touched.
2. **Given** a caller authenticated as a club admin, **When** they invoke the same mutation with the canonical UUID of the same club, **Then** the mutation proceeds, the permission check runs, and the result is identical to today's success path.
3. **Given** an unauthenticated caller, **When** they invoke a Club-scoped mutation with a non-UUID `clubId`, **Then** they receive `BAD_USER_INPUT` (input validation runs before authorization, since a non-UUID can never own a permission scope and there is no information to leak).

---

### User Story 2 — Every Club-scoped mutation behaves consistently (Priority: P2)

A backend developer adding a new mutation that takes a `clubId` arg picks up the existing helper and gets the same error contract for free. A frontend developer calling `createTeam`, `updateClub`, `addPlayerToClub`, `addLocation`, or any other Club-scoped mutation sees the same `BAD_USER_INPUT` error shape when they pass a slug, instead of one mutation throwing 22P02, another throwing `NotFoundException`, and a third silently doing nothing.

**Why this priority**: Without uniformity, every frontend caller has to handle a different failure shape per mutation, and every backend developer is one copy-paste away from re-introducing the original bug. Consistency is what makes the contract enforceable.

**Independent Test**: For each Club-scoped mutation listed in the requirements, send a non-UUID `clubId` and assert the same `BAD_USER_INPUT` shape. None should reach the database.

**Acceptance Scenarios**:

1. **Given** any Club-scoped mutation, **When** the `clubId` (or `id` for `Club`-targeted mutations) arg is a non-UUID string, **Then** the same `BAD_USER_INPUT` error shape is returned.
2. **Given** the read-side `club(id: ...)` query, **When** the caller passes either a UUID or a slug, **Then** the query continues to dual-resolve as today — this feature does **not** tighten the read path.

---

### Edge Cases

- Empty string `""` as `clubId` → `BAD_USER_INPUT` (empty is not a UUID).
- Null / missing `clubId` → handled by GraphQL's `NonNull` validation, not by this feature.
- UUID-like-but-invalid (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) → `BAD_USER_INPUT` (UUID validator rejects non-hex).
- UUID with surrounding whitespace → `BAD_USER_INPUT`. Callers must send a clean UUID; trimming is not the server's responsibility.
- Uppercase UUID → accepted (the UUID validator is case-insensitive; Postgres normalizes).
- The read-side `club(id: ...)` query — explicitly out of scope; keeps UUID-or-slug behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reject any Club-scoped mutation invocation whose `clubId` (or, for `Club`-targeted mutations, `id`) argument is not a syntactically valid UUID, before opening a transaction, acquiring an advisory lock, or executing any database query.
- **FR-002**: Rejection MUST produce a GraphQL error with `extensions.code = "BAD_USER_INPUT"` and include enough context to debug (the offending field name and the offending value).
- **FR-003**: Validation MUST run **before** the authorization check on these mutations. A non-UUID can never match a permission scope of the form `${clubId}_edit:club`, so failing fast costs nothing and avoids information leaks via timing.
- **FR-004**: The validation MUST apply uniformly to every Club-scoped mutation entry point: `recalculateTeamNumbersForGroup`, `createTeam`, `createTeams`, `updateClub`, `removeClub`, `addPlayerToClub`, `addLocation`, the event-entry mutations that take `clubId`, and the enrollment-submission resolver (validated at the resolver boundary that invokes `submit-enrollment.service.ts`).
- **FR-005**: The read-side `club(id: ...)` query MUST keep its existing UUID-or-slug dual-resolution behavior. This feature does NOT change read semantics.
- **FR-006**: `BAD_USER_INPUT` MUST be a named constant in the shared `ErrorCode` registry. No string literal `"BAD_USER_INPUT"` may appear at a mutation throw site.
- **FR-007**: The `recalculateTeamNumbersForGroup` contract document MUST be updated to declare the validation step and the new failure row, so the contract is the source of truth for future implementations.
- **FR-008**: The frontend-impact document for feature 008 MUST be updated to state that callers must pass `club.id`, not `club.slug`, and to point at the existing cached `club(id: slug) { id }` round-trip as the resolution mechanism.

### Key Entities

- **Club-scoped mutation**: any GraphQL mutation whose first DB action is `Club.findByPk(arg)`. The exhaustive list lives in the implementation plan; this spec treats them as a class.
- **`BAD_USER_INPUT` error**: the classified GraphQL error shape introduced by this feature — `{ code, field, value, userId? }` in `extensions`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `invalid input syntax for type uuid` log lines attributable to Club-scoped mutations during a normal exercise of the frontend (login → club page → enrol/create team / recalculate / update club). Measured by tailing `docker compose logs postgres` during the manual quickstart walk.
- **SC-002**: 100% of the Club-scoped mutations listed in FR-004 return `BAD_USER_INPUT` (not `22P02`, not `NotFoundException`, not a stack trace) when called with a non-UUID `clubId`. Verified by one new spec case per resolver.
- **SC-003**: The recalculate mutation does not open a Sequelize transaction when input validation fails. Verified by an assertion that `Sequelize.transaction` is called zero times on the bad-input path.
- **SC-004**: The existing 008 integration test (`team-renumbering.integration.spec.ts`) and all current unit tests for the touched resolvers stay green — this feature must not regress any UUID-path behavior.

## Assumptions

- The legacy Angular frontend (`apps/badman/`, `libs/frontend/`) is no longer deployed and there are no external API consumers passing slugs as `clubId`. Tightening the contract is therefore safe; we are not breaking known clients.
- The new Next.js frontend is the only live caller and is under our control. Where it currently passes slugs, we will update it in a follow-up frontend PR to resolve `club(id: slug) { id }` once and reuse the UUID. Apollo's cache makes this a near-zero-cost round-trip.
- Tightening other entity-id args (`teamId`, `playerId`, `encounterId`, `subEventId`, …) follows the same shape but is **out of scope**. This feature fixes only the observed Club-scoped class.
- `BAD_USER_INPUT` is a one-time addition to the `ErrorCode` registry; subsequent input-validation features reuse it without further changes.
- The `club(id: ...)` query keeps dual UUID-or-slug resolution. Anyone who needs a UUID from a slug uses that query.
