# Feature Specification: DataLoader for Comment.player field resolver

**Feature Branch**: `026-dataloader-comment-player`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Comment.player — wherever Comment is exposed in the schema. One findByPk per comment; batch by playerId."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fetching a list of comments resolves author players in one query (Priority: P1)

A user opens a page that displays comments (e.g., encounter annotations or club notes), receiving a list of N `Comment` rows. Today each row's `player` field resolver issues one `Player.findByPk(playerId)` call — N individual lookups. After this change, all `playerId` values across the comment list are batched into a single `Player.findAll` with an `IN` clause. The user sees identical data; the backend issues one Player query regardless of comment count.

**Why this priority**: Direct N+1 pattern. Comments in the system can appear on encounters, draws, or clubs; any view listing multiple comments with their authors triggers this pattern.

**Independent Test**: Spy on `Player.findAll` (or `Player.findByPk`) in a unit test returning 8 Comment rows. Assert the spy is called exactly once after all field resolvers resolve.

**Acceptance Scenarios**:

1. **Given** a query returning 10 `Comment` rows with distinct `playerId` values, **When** the `player` field resolver executes for each row, **Then** exactly one bulk Player lookup is issued.
2. **Given** multiple comments authored by the same player (`playerId` deduped by DataLoader), **When** the batch resolves, **Then** one DB fetch is performed for that id and the Player instance is shared across rows.
3. **Given** a comment with a `playerId` whose Player record no longer exists, **When** the batch resolves, **Then** that comment's `player` field returns `null` without breaking other comments in the list.
4. **Given** a new GraphQL request for comments, **When** it resolves, **Then** a fresh request-scoped DataLoader is used — no player data from a prior request is reused.

---

### Edge Cases

- `playerId` is null on a Comment row (anonymous comment, if supported). Field resolver returns `null` without dispatching a batch key.
- All comments in the list share one `playerId` (e.g., all authored by an admin). DataLoader deduplicates to a single DB fetch.
- DB error in batch fn propagates to all callers; no partial result is returned for that batch.
- `Comment` is exposed via multiple schema entry points (encounter, club, etc.). The request-scoped DataLoader is shared across all entry points within one request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-row `Player.findByPk(playerId)` call in the `Comment.player` field resolver with a DataLoader-backed lookup that batches all `playerId` values arriving in one microtask tick.
- **FR-002**: The DataLoader batch fn MUST issue a single `Player.findAll({ where: { id: { [Op.in]: keys } } })` and return results in input-key order with `null` for missing ids.
- **FR-003**: The DataLoader instance MUST be request-scoped; no Player data from one request leaks into another.
- **FR-004**: System MUST return `null` for any `playerId` whose Player record does not exist.
- **FR-005**: System MUST NOT change the `Comment.player` GraphQL field type or nullability.
- **FR-006**: If a shared `PlayerLoaderService` already exists (from features 022/023), the `Comment.player` resolver MUST reuse it rather than creating a separate DataLoader for Player.
- **FR-007**: Existing tests for the Comment resolver MUST continue to pass.

### Key Entities

- **CommentResolver**: The resolver wherever `Comment` is exposed in the GraphQL schema. Owns the `player` field resolver being batched.
- **Player**: Sequelize model fetched in bulk by the DataLoader batch fn.
- **PlayerLoaderService**: Request-scoped service owning `DataLoader<string, Player>`. May be shared with RankingPoint (022) and RankingLastPlace (023) resolvers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a query returning N Comment rows, Player DB lookups drop from N to 1, regardless of N.
- **SC-002**: For comments sharing a `playerId`, exactly one DB lookup is performed for that id (confirmed by test spy).
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures.
- **SC-004**: If merged after 022/023, no duplicate `PlayerLoaderService` class exists — the shared loader is reused across all three resolvers.

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019).
- `Comment.player` is the only per-row Player lookup in the Comment resolver; no other field in the Comment type triggers a similar N+1.
- Pre-condition for shipping: Sentry N+1 alert on the `Comment.player` resolver OR documented hot-path manual test. This is the lowest-priority opt-in candidate from spec 019 (comment pages are lower traffic than ranking or encounter pages).
- If features 022 and 023 are merged first, a `PlayerLoaderService` already exists and this feature need only wire the Comment resolver into it — implementation effort is minimal.
