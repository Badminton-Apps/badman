# Feature Specification: DataLoader for EncounterCompetition home/away/drawCompetition associations

**Feature Branch**: `024-dataloader-encounter-associations`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "EncounterCompetition.home / .away / .drawCompetition — per-encounter getHome() / getAway() / getDrawCompetition() — batch Teams + DrawCompetitions referenced across an encounters list."

> **Context note**: The `encounterCompetitions` root query already eager-loads home and away Teams via Sequelize `include`. However, the `home`, `away`, and `drawCompetition` `@ResolveField` methods are always invoked by Apollo regardless of what the parent query loaded — and they call `encounter.getHome()`, `encounter.getAway()`, `encounter.getDrawCompetition()` which are Sequelize getter methods that always issue new DB queries. The N+1 therefore applies to all GraphQL query paths that request these fields. Additionally, several other field resolvers on `EncounterCompetition` call per-row getters (`location`, `gameLeader`, `tempHomeCaptain`, etc.) — these are explicitly out of scope for this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fetching a draw's encounters resolves home/away teams and draw in bulk (Priority: P1)

A competition manager opens a draw overview, which returns a list of N `EncounterCompetition` records. Today each encounter's `home`, `away`, and `drawCompetition` field resolvers issue individual Team and DrawCompetition lookups — up to 3N queries for a draw with N encounters. After this change, all `homeTeamId`, `awayTeamId`, and `drawId` values are collected across the encounter list and resolved in at most three bulk queries (one for Teams covering both home/away, one for DrawCompetitions). The manager sees identical data with dramatically fewer DB round-trips.

**Why this priority**: Draws can contain 8–32 encounters. A 16-encounter draw triggers 16 home + 16 away + 16 drawCompetition individual queries today — 48 queries collapsing to 2. This is the highest-multiplier N+1 in the encounter resolver.

**Independent Test**: Spy on `Team.findAll` and `DrawCompetition.findAll` (or `findByPk`) in a unit test with 10 encounters. Assert `Team.findAll` called once (covering both home and away ids) and `DrawCompetition.findAll` called once.

**Acceptance Scenarios**:

1. **Given** a draw containing 16 encounters, **When** the resolver fetches `home`, `away`, and `drawCompetition` for each, **Then** at most 2 DB queries are issued — one bulk Team fetch for all home+away ids, one bulk DrawCompetition fetch for all draw ids.
2. **Given** multiple encounters share the same `homeTeamId` or `awayTeamId`, **When** the DataLoader deduplicates ids, **Then** each unique team id is fetched exactly once.
3. **Given** an encounter whose `drawId` resolves to a DrawCompetition already fetched for another encounter in the same request, **When** the DataLoader cache returns the result, **Then** no additional DB query is made.
4. **Given** a subsequent request for a different draw's encounters, **When** it resolves, **Then** fresh DataLoader instances are used and no team or draw data from the prior request is reused.

---

### Edge Cases

- An encounter has `homeTeamId` or `awayTeamId` null (bye or walkover). The field resolver returns `null` without dispatching a batch key.
- Team or DrawCompetition row deleted after the encounter was created. The batch fn maps the id to `null`; the field resolver returns `null`.
- A draw contains only 1 encounter. The DataLoader still batches correctly (one key = one bulk query with one result).
- Home and away teams happen to be the same id (should not occur, but the DataLoader deduplicates and returns the same Team instance to both fields).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the per-encounter `getHome()`, `getAway()`, and `getDrawCompetition()` calls in `encounter.resolver.ts` with DataLoader-backed lookups that batch ids across all encounters resolving in the same request tick.
- **FR-002**: Home and away team ids MUST be batched together into a single `Team` DataLoader keyed by team id, so home and away fields share one bulk Team query.
- **FR-003**: Draw ids MUST be batched into a single `DrawCompetition` DataLoader keyed by draw id.
- **FR-004**: All DataLoader instances MUST be request-scoped; no team or draw data from one request may be served to another.
- **FR-005**: System MUST return `null` for any id whose corresponding Team or DrawCompetition record does not exist.
- **FR-006**: System MUST NOT change the GraphQL field types or nullability of `EncounterCompetition.home`, `.away`, or `.drawCompetition`.
- **FR-007**: Existing unit tests for the encounter resolver MUST continue to pass without weakening assertions.

### Key Entities

- **EncounterCompetitionResolver**: Resolver in `encounter.resolver.ts`. Owns the `home`, `away`, and `drawCompetition` field resolvers being batched.
- **Team**: Sequelize model fetched in bulk for home and away associations.
- **DrawCompetition**: Sequelize model fetched in bulk for the drawCompetition association.
- **TeamLoaderService**: Request-scoped DataLoader service keyed by team id. May be shared with other features (e.g., `TeamAssociationService` loaders from 019).
- **DrawCompetitionLoaderService**: Request-scoped DataLoader service keyed by draw id.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a draw with N encounters, Team DB lookups drop from 2N (home + away) to 1 bulk query, and DrawCompetition lookups drop from N to 1 bulk query.
- **SC-002**: For shared ids across encounters (same home team in multiple encounters), exactly one DB row fetch occurs per unique id.
- **SC-003**: Zero new TypeScript errors, lint warnings, or test failures.
- **SC-004**: Response payload for a draw's encounters is semantically identical before and after the change.

## Assumptions

- The `dataloader` package (v2.x) is already a runtime dependency (added in feature 019).
- `encounter.resolver.ts` contains the three field resolvers (`home`, `away`, `drawCompetition`) as separate methods, each currently issuing an individual lookup.
- The `encounterCompetitions` root query already eager-loads home and away teams via Sequelize `include`, so `encounter.home` and `encounter.away` may be pre-populated for that path. However, the `@ResolveField` methods call `encounter.getHome()` and `encounter.getAway()` — Sequelize association getter methods that always issue new DB queries regardless of the pre-loaded property. The N+1 applies to all GraphQL query paths that request these fields.
- Pre-condition for shipping: Sentry N+1 alert on encounter association resolvers OR documented hot-path test for a large draw. Listed as opt-in candidate in spec 019.
- If a shared `TeamLoaderService` already exists from the `TeamAssociationService` DataLoader migration (019), this feature reuses it for home/away team lookups rather than creating a duplicate.

## Clarifications

### Session 2026-05-19

- Q: Does the N+1 for `home`/`away`/`drawCompetition` apply to the root `encounterCompetitions` query path or only to parent-resolver paths? → A: Applies to all paths. Apollo always invokes `@ResolveField` methods; Sequelize getter methods (`getHome()`, `getAway()`, `getDrawCompetition()`) always issue new DB queries regardless of what the parent query eager-loaded. Context note and Assumptions updated accordingly.
