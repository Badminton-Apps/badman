# Feature Specification: DataLoader for SubEvent / DrawCompetition / EventEntry parent FK associations

**Feature Branch**: `025-dataloader-subevent-draw-associations`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "SubEvent.eventCompetition, DrawCompetition.subEventCompetition, EventEntry.subEventCompetition — per-row association lookups in competition + tournament resolvers; batch by parent FK."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fetching a competition's sub-events resolves parent event in one query (Priority: P1)

A tournament administrator loads the competition structure, which returns a list of `SubEvent` rows. Today each row's `eventCompetition` field resolver issues one `EventCompetition.findByPk` call — N queries for N sub-events. After this change, all parent `eventCompetitionId` FK values are batched and resolved in a single bulk query. The administrator sees the same data; the backend issues one query instead of N.

**Why this priority**: Competition structure pages are hierarchical — a single page load often fetches SubEvents, their DrawCompetitions, and DrawCompetitions' EventEntries. Unbatched, each level multiplies the query count. Batching all three FK associations in one feature prevents a 3× cascade.

**Independent Test**: Spy on `EventCompetition.findAll`, `SubEventCompetition.findAll` in unit tests for each resolver. Assert each spy is called once for a list of 5 rows. No infrastructure required.

**Acceptance Scenarios**:

1. **Given** a query returning 8 `SubEvent` rows all belonging to the same `EventCompetition`, **When** `SubEvent.eventCompetition` resolves, **Then** exactly one `EventCompetition` lookup is issued.
2. **Given** a query returning 8 `DrawCompetition` rows each linked to a `SubEventCompetition`, **When** `DrawCompetition.subEventCompetition` resolves, **Then** exactly one `SubEventCompetition` bulk lookup is issued.
3. **Given** a query returning 20 `EventEntry` rows linked to various `SubEventCompetition` records, **When** `EventEntry.subEventCompetition` resolves, **Then** exactly one `SubEventCompetition` bulk lookup is issued (with dedup for shared ids).
4. **Given** a subsequent request for the same competition structure, **When** it resolves, **Then** fresh DataLoader instances are used — no cross-request parent-entity cache leaks.

---

### Edge Cases

- A `SubEvent` has `eventCompetitionId = null` (tournament sub-event with no competition parent). Field resolver returns `null` without dispatching a batch key.
- Parent entity deleted after the child row was created. The batch fn maps the FK to `null`; field resolver returns `null`.
- Multiple child rows share the same parent FK. DataLoader deduplicates — one DB fetch for that parent id shared across all children.
- Tournament resolver and competition resolver both use `DrawCompetition.subEventCompetition` — if they fire in the same request tick, the shared request-scoped DataLoader batches them together.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-row `EventCompetition` lookup in the `SubEvent.eventCompetition` field resolver with a DataLoader that batches all `eventCompetitionId` FK values per request tick.
- **FR-002**: System MUST replace the per-row `SubEventCompetition` lookup in the `DrawCompetition.subEventCompetition` field resolver with a DataLoader that batches all `subEventCompetitionId` FK values per request tick.
- **FR-003**: System MUST replace the per-row `SubEventCompetition` lookup in the `EventEntry.subEventCompetition` field resolver with a DataLoader. This MUST reuse the same `SubEventCompetitionLoaderService` as FR-002 if both resolvers fire in the same request.
- **FR-004**: All DataLoader instances MUST be request-scoped; no parent-entity data leaks between requests.
- **FR-005**: System MUST return `null` for any FK whose parent record does not exist, without affecting other rows.
- **FR-006**: System MUST NOT change GraphQL field types or nullability for any of the three associations.
- **FR-007**: Existing tests for competition and tournament resolvers MUST continue to pass.

### Key Entities

- **SubEventResolver**: Owns `SubEvent.eventCompetition` field resolver. Batches by `eventCompetitionId`.
- **DrawCompetitionResolver**: Owns `DrawCompetition.subEventCompetition` field resolver. Batches by `subEventCompetitionId`.
- **EventEntryResolver** (or embedded in enrollment resolver): Owns `EventEntry.subEventCompetition` field resolver. Shares `SubEventCompetitionLoaderService` with DrawCompetitionResolver.
- **EventCompetitionLoaderService**: Request-scoped DataLoader keyed by `eventCompetitionId`.
- **SubEventCompetitionLoaderService**: Request-scoped DataLoader keyed by `subEventCompetitionId`; shared across DrawCompetition and EventEntry resolvers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a competition structure page loading M sub-events, K draws, and J event-entries, parent-entity lookups drop from M+K+J individual queries to at most 3 bulk queries (one per parent entity type), with deduplication reducing further for shared ids.
- **SC-002**: Zero cross-request data leaks confirmed by test isolation (fresh instance per request).
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures.
- **SC-004**: Response payload for competition structure queries is semantically identical before and after the change.

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019).
- The three field resolvers (`SubEvent.eventCompetition`, `DrawCompetition.subEventCompetition`, `EventEntry.subEventCompetition`) currently perform individual `findByPk` or equivalent single-row lookups.
- `DrawCompetition.subEventCompetition` and `EventEntry.subEventCompetition` share the same parent model (`SubEventCompetition`) and can therefore reuse one DataLoader service.
- Pre-condition for shipping: Sentry N+1 alert on any of these three resolver paths OR documented hot-path manual test. Listed as opt-in candidate in spec 019.
- Tournament sub-events that have no `eventCompetitionId` are already returning `null` today; this behaviour is preserved.
