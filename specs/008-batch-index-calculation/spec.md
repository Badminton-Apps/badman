# Feature Specification: Batch Index Calculation in Team Creation

**Feature Branch**: `016-batch-index-calculation`  
**Created**: 2026-05-13  
**Status**: Draft  
**Input**: User description: "Refactor createTeams to batch all index calculations into a single calculate() call instead of calling calculateOne() per team in a loop"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Multiple Teams Without Slow Response (Priority: P1)

A club secretary submits enrollment for a club with multiple teams (e.g. 8–12 teams across disciplines). Today each team triggers an independent ranking lookup cycle, causing the mutation to take several seconds. After this change, all ranking lookups are resolved in a single pass, and the response returns in a fraction of the previous time.

**Why this priority**: This is the core performance problem. Every club enrollment with more than one team hits this. Directly impacts the enrollment submission experience.

**Independent Test**: Submit enrollment for a club with 8 teams and verify the response returns faster than before, with all team indices correctly populated.

**Acceptance Scenarios**:

1. **Given** a club with 8 teams being enrolled, **When** the enrollment mutation is submitted, **Then** all 8 team indices are calculated and returned correctly in a single response.
2. **Given** a club with 1 team, **When** the enrollment mutation is submitted, **Then** behavior is identical to before (no regression).
3. **Given** teams spread across multiple sub-events (different seasons/disciplines), **When** submitted together, **Then** all indices resolve correctly per their respective sub-event contexts.

---

### User Story 2 - No Change to Enrollment Result Data (Priority: P2)

The returned enrollment data (team index values, contributing players, missing player count) must be identical to what the current per-team calculation produces. The optimization must be transparent to callers.

**Why this priority**: Correctness is non-negotiable. The batch approach must produce the same results as N individual calls.

**Independent Test**: Run the same enrollment payload against both the old and new implementation; compare all index values and contributing player lists in the response.

**Acceptance Scenarios**:

1. **Given** any enrollment payload, **When** submitted, **Then** each team's index, contributingPlayers, and missingPlayerCount match what calculateOne would have produced for that team individually.
2. **Given** a team where index calculation fails (e.g. player not found), **When** submitted in a batch with other valid teams, **Then** only that team's entry fails; other teams succeed normally.

---

### User Story 3 - Slow Batches Remain Visible in Monitoring (Priority: P3)

The existing Sentry span and slow-warn log on `IndexCalculationService.calculate()` continue to fire with accurate input counts and duration, so operations can track whether the batched call is still slow.

**Why this priority**: Observability was just added. The refactor must not regress it.

**Independent Test**: Trigger an enrollment with multiple teams and verify Sentry receives one span with `index_calc.input_count` equal to the number of teams, plus duration and player ref count.

**Acceptance Scenarios**:

1. **Given** an enrollment with 8 teams, **When** submitted, **Then** exactly one Sentry span is emitted with `index_calc.input_count = 8`.
2. **Given** a batch that takes over 1000ms, **When** submitted, **Then** a WARN log line is emitted (same as before).

---

### Edge Cases

- What happens when zero teams have an entry with player metadata? (calculate() receives empty input — must short-circuit, no error)
- How does the system handle a mix of teams where some have entries and some do not? (only teams with entry player metadata are included in the batch)
- What happens when a single team's calculation fails within the batch? (entire mutation fails and rolls back — no partial enrollment)
- What if two teams share the same set of players? (batch deduplicates player lookups; both teams still receive their own result)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The team-creation flow MUST collect all `IndexCalculationInput` objects across all teams before invoking `IndexCalculationService`.
- **FR-002**: The team-creation flow MUST call `IndexCalculationService.calculate()` exactly once per mutation invocation, passing all inputs as a batch.
- **FR-003**: Results from the batch call MUST be fanned back to each team's entry using the `key` field (set to `dbEntry.id`).
- **FR-004**: A failure result for any team MUST cause the entire mutation to fail and roll back — partial enrollment is not permitted.
- **FR-005**: Teams that have no entry or no player metadata MUST be excluded from the batch input without error.
- **FR-006**: The batch call MUST pass the same transaction used for team/entry creation, so ranking reads are consistent with the write transaction.
- **FR-007**: Error handling for a failed team (PLAYER_NOT_FOUND, RANKING_SYSTEM_NOT_FOUND, etc.) MUST produce the same GraphQL error shape as the current per-team implementation.

### Key Entities

- **IndexCalculationInput**: Represents one team's calculation request — key (entry ID), type, subEventCompetitionId, players.
- **IndexCalculationResult**: Success or failure result keyed by the input's `key` field.
- **EventEntry**: The DB row whose ID is used as the batch key; receives the calculated index data after the batch resolves.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Enrolling a club with 12 teams completes in under 2 seconds end-to-end.
- **SC-002**: The number of database round-trips during a multi-team enrollment is bounded by a fixed constant (≤ 5) regardless of team count.
- **SC-003**: All existing index-calculation unit tests pass without modification.
- **SC-004**: The Sentry span emitted during enrollment reports `index_calc.input_count` equal to the number of teams with player metadata in the batch.
- **SC-005**: No change in the GraphQL response shape or error codes visible to API callers.

## Clarifications

### Session 2026-05-13

- Q: Should a single team's index calculation failure fail the entire mutation or allow partial success? → A: Fail-fast — any failure rolls back the entire transaction; partial enrollment is not permitted.
- Q: What is the concrete performance target for SC-001? → A: Under 2 seconds end-to-end for 12 teams.

## Assumptions

- The `key` field on `IndexCalculationInput` (set to `dbEntry.id`) is sufficient to fan results back to the correct team entry — this is already the pattern in the current code.
- All teams in a single `createTeams` mutation share the same Sequelize transaction, so passing it to the single `calculate()` call is safe.
- Failure handling per team (logging + throwing GraphQLError) preserves the existing behavior; the mutation still fails if any team's calculation fails, since throwing inside the transaction causes rollback.
- The `calculateOne` convenience method remains available for other callers (e.g. the entry-model hook in `calculate-index` resolver) that legitimately operate on a single input.
