# Feature Specification: ClubPlayerMembership Resolver Upgrades

**Feature Branch**: `004-addplayertoclub-return-membership`
**Created**: 2026-04-30
**Status**: Draft
**Linear**: [BAD-129](https://linear.app/dashdot/issue/BAD-129) — Priority: High

## Clarifications

### Session 2026-04-30

- Q: Should adding a player who is already a member return an error, or return the existing membership record idempotently? → A: Idempotent — return existing `ClubPlayerMembership` with `alreadyExisted: true`; no write occurs. Consistent with `TeamResult` / `EnrollmentResult` pattern.

## Scope note

This spec extends the BAD-129 fix beyond `addPlayerToClub` to bring the entire ClubPlayerMembership domain (`addPlayerToClub`, `updateClubPlayerMembership`, `removePlayerFromClub`) up to the conventions established by 002 (team-resolver-improvements):

- Classified `GraphQLError` codes from the shared registry instead of `UnauthorizedException` / `NotFoundException`
- Idempotency on create (already covered by FR-001..FR-005)
- Resolver test coverage per Constitution IV
- Result `@ObjectType` for `addPlayerToClub`

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Enrollment wizard adds a transfer/loan and can immediately remove it (Priority: P1)

During enrollment, a club admin adds a player as a transfer or loan to a club. The system confirms the membership was created and returns enough information for the admin to remove that same membership in the same workflow session — without needing to navigate away or reload.

**Why this priority**: Without the membership record in the response, the wizard has no way to delete the membership it just created. This blocks the core transfer/loan management flow (BAD-120).

**Independent Test**: Can be fully tested by adding a player to a club and verifying the response contains a membership record with an ID, then using that ID to delete the membership.

**Acceptance Scenarios**:

1. **Given** an admin adds a player as a transfer to a club, **When** the operation succeeds, **Then** the response contains a membership record including at minimum: a unique membership ID, the membership type, the season, the club identifier, and the player identifier.
2. **Given** an admin receives the membership record from step 1, **When** they immediately delete it using the membership ID, **Then** the deletion succeeds without any additional lookups.
3. **Given** an admin adds a player as a loan to a club, **When** the operation succeeds, **Then** the returned membership record reflects the loan type.

---

### User Story 2 — Clients receive machine-readable error codes (Priority: P1)

When any of the three ClubPlayerMembership mutations fail, the response carries a stable error code from the shared registry that clients can pin behavior to (display localized messages, redirect to login on permission denial, etc.).

**Why this priority**: Without classified codes, clients must parse error messages — fragile and locale-dependent. Aligns with 002's resolver upgrade pattern and Constitution Principle III.

**Independent Test**: Each error path is covered by a unit test that asserts the exact `extensions.code` value.

**Acceptance Scenarios**:

1. **Given** a caller without club edit permission, **When** they call any of the three mutations, **Then** the error response contains `extensions.code = "PERMISSION_DENIED"`.
2. **Given** the referenced club does not exist (add path), **When** the mutation is called, **Then** the error response contains `extensions.code = "CLUB_NOT_FOUND"`.
3. **Given** the referenced player does not exist (add path), **When** the mutation is called, **Then** the error response contains `extensions.code = "PLAYER_NOT_FOUND"`.
4. **Given** the referenced membership does not exist (update or remove path), **When** the mutation is called, **Then** the error response contains `extensions.code = "MEMBERSHIP_NOT_FOUND"`.

---

### User Story 3 — Existing callers continue to work without breaking (Priority: P2)

Any existing caller that previously checked a simple success/failure result for these mutations continues to function correctly after the change.

**Why this priority**: Existing callers must not break when the `addPlayerToClub` response shape changes from a simple boolean to a richer record.

**Independent Test**: Verified by running existing functionality that adds, updates, or removes club memberships and confirming no regressions.

**Acceptance Scenarios**:

1. **Given** an existing caller that only checks whether `addPlayerToClub` succeeded, **When** the operation runs after this change, **Then** the caller can still determine success by checking that a result was returned (non-null).
2. **Given** the operation fails, **When** the caller handles the error, **Then** error semantics remain unchanged from before (still throws; just with a stable code now).

---

### User Story 4 — Resolver test coverage matches the rest of the codebase (Priority: P2)

The three mutations follow Constitution Principle IV: each one has a co-located `*.spec.ts` covering the standard cases.

**Why this priority**: Without these tests, regressions in auth, not-found, and rollback paths slip through silently. The other resolvers (`enrollmentSetting`, `team`, `enrollment`) all have this coverage.

**Independent Test**: `nx test backend-graphql` covers all three mutations across the standard CRUD case matrix.

**Acceptance Scenarios**:

1. **Given** the test suite, **When** it runs, **Then** every mutation has tests for: query/lookup-returns-data, mutation-rejects-unauthorized (PERMISSION_DENIED), mutation-handles-not-found (CLUB/PLAYER/MEMBERSHIP_NOT_FOUND), mutation-success-with-commit, mutation-rolls-back-on-error.
2. **Given** the `addPlayerToClub` test, **When** it runs, **Then** it additionally verifies idempotent return (`alreadyExisted: true`) when the player is already a member of the same club/season/type.

---

### Edge Cases

- A membership row already exists for the same `(clubId, playerId, start)` — operation is idempotent: returns the existing membership with `alreadyExisted: true`; no error and no duplicate row.
- Caller lacks `${clubId}_edit:club` and `edit-any:club` permissions — authorization error returned with `PERMISSION_DENIED`; no membership created/modified/removed.
- Update or remove called with a membership ID that does not exist — error with `MEMBERSHIP_NOT_FOUND`; no partial state.
- Membership created successfully but caller discards the ID — no functional regression; deletion still possible via other lookup paths (out of scope for this ticket).

## Requirements *(mandatory)*

### Functional Requirements

#### Add player to club

- **FR-001**: When `addPlayerToClub` succeeds, the system MUST return a result containing at minimum: membership ID, membership type, start date, end date (nullable), club identifier, player identifier, and an `alreadyExisted` flag. (Note: the model has no `season` field — start date is the season anchor.)
- **FR-002**: The result returned MUST reflect the exact membership created or matched (not a cached or approximate value).
- **FR-003**: Callers that previously checked a boolean success result MUST be updated to check for a non-null result as the success signal.
- **FR-004**: When a membership already exists for the same `(clubId, playerId, start)`, the system MUST return that existing membership idempotently with `alreadyExisted: true`; no write occurs and no error is raised.
- **FR-005**: When `addPlayerToClub` fails for reasons other than duplicate membership (authorization, validation, missing player/club), the system MUST throw a classified error — not a null result.

#### Classified errors (all three mutations)

- **FR-006**: When the caller lacks club-edit permission for the targeted club, the system MUST throw `GraphQLError` with `extensions.code = ErrorCode.PERMISSION_DENIED`. This applies to `addPlayerToClub`, `updateClubPlayerMembership`, and `removePlayerFromClub`.
- **FR-007**: When `addPlayerToClub` references a club ID that does not exist, the system MUST throw `GraphQLError` with `extensions.code = ErrorCode.CLUB_NOT_FOUND`.
- **FR-008**: When `addPlayerToClub` references a player ID that does not exist, the system MUST throw `GraphQLError` with `extensions.code = ErrorCode.PLAYER_NOT_FOUND`.
- **FR-009**: When `updateClubPlayerMembership` or `removePlayerFromClub` references a membership ID that does not exist, the system MUST throw `GraphQLError` with `extensions.code = ErrorCode.MEMBERSHIP_NOT_FOUND` (new code).
- **FR-010**: All thrown error codes MUST come from the shared registry [`libs/backend/graphql/src/utils/error-codes.ts`](../../libs/backend/graphql/src/utils/error-codes.ts). Inline string-literal codes are forbidden.

#### Test coverage

- **FR-011**: Each of the three mutations MUST have a co-located `*.spec.ts` covering: success path with transaction commit, unauthorized → `PERMISSION_DENIED`, not-found → appropriate `*_NOT_FOUND`, and error path with transaction rollback. Tests MUST follow the pattern in `enrollmentSetting.resolver.spec.ts` (mocked `Sequelize`, `jest.spyOn` on model statics, fake `Player` with `hasAnyPermission` jest.fn(), `afterEach(jest.restoreAllMocks)`).
- **FR-012**: `addPlayerToClub` tests MUST additionally cover the idempotent return path (`alreadyExisted: true` on duplicate add).

### Key Entities

- **ClubPlayerMembership**: Represents a player's association with a club for a specific season. Fields: unique ID, membership type (transfer/loan/regular), season, club ID, player ID.
- **AddPlayerToClubResult**: Result returned by `addPlayerToClub`. Wraps `ClubPlayerMembership` fields plus `alreadyExisted: boolean` (true when the player was already a member of the same club/season/type and no write occurred).
- **ErrorCode.MEMBERSHIP_NOT_FOUND**: New entry in the shared error-code registry, used by `updateClubPlayerMembership` and `removePlayerFromClub` when the referenced membership ID does not exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated tests for the three ClubPlayerMembership mutations pass, covering success, idempotent re-add, authorization rejection, all not-found paths, and rollback.
- **SC-002**: Zero regressions in existing callers — all features that add, update, or remove club memberships continue to work after the change.
- **SC-003**: BAD-120 frontend can complete a full transfer/loan add-then-delete flow in a single session without an additional lookup call, verified by end-to-end test.
- **SC-004**: Zero `UnauthorizedException` or `NotFoundException` throws remain in `club.resolver.ts` for the three target mutations — all replaced by classified `GraphQLError` per FR-006..FR-010.

## Assumptions

- Membership type values (transfer, loan, regular) already exist and are unchanged by this fix.
- The season field in the membership record corresponds to the active enrollment season at time of creation.
- Existing callers of the three mutations are known and can be audited before shipping.
- No new membership fields beyond the five listed are required by downstream consumers at this time.
- The natural uniqueness key for idempotency on `addPlayerToClub` is `(clubId, playerId, start)` — matching the existing DB unique constraint `ClubPlayerMemberships_playerId_clubId_unique`. The model has no `season` field; "season" in the result object will be derived from `start` (the badminton season the start date falls in).

## Dependencies

- BAD-120: Persist transfers and loans in enrollment wizard — `addPlayerToClub` change is a hard prerequisite for that feature's FR-003 and FR-005 (immediate delete after add).
- 002 (team-resolver-improvements): established the result-object + classified-error + idempotency conventions this spec applies to the ClubPlayerMembership domain.
- Constitution Principle III (v1.1.0): codifies the idempotency rule.
