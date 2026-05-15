# Feature Specification: Twizzit Operational Sync & Reconcile

**Feature Branch**: `017-twizzit-sync`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "/speckit-specify — follow-up to shadow backfill (spec 016): introduce a dedicated Badman-side sync boundary for duplicate analysis and for reconciling staged Twizzit contacts and memberships into operational players and club memberships. Use the new JSON API stack only; do not move or depend on the legacy XML-based federation integration."

## Scope clarifier *(read first)*

This specification covers **comparison, de-dupe insight, and reconciliation** from **locally staged Twizzit data** (shadow tables delivered under spec `016-twizzit-shadow-sync`) into **operational Badman records** (players and club memberships), using the **same read-only HTTP client** as the shadow pipeline.

**In scope**

- Analysis and reporting on duplicate or ambiguous person identities in staged data (natural-key collisions, missing federation member identifiers where expected).
- Idempotent linkage and updates so each reconcilable staged contact maps to exactly one operational player, with stable external identity for the federation contact.
- Idempotent linkage and updates for federation memberships represented in staged data toward operational club–player memberships, including temporal validity (start/end) where those facts exist at source.
- Run-level resilience: skipped or problematic rows are recorded; the run can complete while surfacing aggregates for operators.
- **Separation**: this work lives in its own bounded backend sync area — not inside the staging-only ingest library, not inside the legacy importer.

**Out of scope**

- Replacing or refactoring the legacy XML-based federation sync, game-export path, Bull job wiring, or legacy Angular module — unless a later specification explicitly merges retirement of that stack.
- New GraphQL or end-user-facing product UI for this flow in v1 (operator-facing tooling may be scripts, logs, exports, or internal runs — decided in implementation planning).
- Ongoing incremental delta sync driven by federation “last modified” metadata (may arrive later from the vendor); v1 assumes **operator-triggered** reconcile passes against data already staged (and may read live federation through the typed client where the plan calls for freshness checks).

**Dependencies**

- Staged federation dataset exists per environment pairing (staging Twizzit / staging Badman DB; production pairing separately) — as established in spec `016-twizzit-shadow-sync`.
- Domain rules and glossary: [`docs/twizzit/Requirements.md`](../../docs/twizzit/Requirements.md) (F2 player identity, F3 memberships, F4 membership types).

## References

- **Staging / shadow feature**: [`specs/016-twizzit-shadow-sync/spec.md`](../016-twizzit-shadow-sync/spec.md) — ingestion only; explicitly deferred comparison and reconciliation.
- **Typed HTTP read client**: Delivered under spec `015-twizzit-api-client` (`libs/integrations/twizzit-client/`) — the sync boundary MUST use this client for live federation reads, not bespoke HTTP nor legacy XML transports.
- **Architecture decision**: Operational sync logic is consolidated in a dedicated backend Twizzit sync module (`backend-twizzit-sync` naming in planning artifacts) that **does not** import legacy `@badman/backend-twizzit`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Federation duplicate insight (Priority: P1)

As a platform operator, I can run an analysis pass over staged federation contacts to find natural-key collisions (same first name + last name + date of birth) and other identity ambiguities, and receive actionable counts plus examples so data stewards can intervene before bulk reconcile.

**Why this priority**: Reconciliation assumes trustworthy identity keys; ambiguity must be surfaced before widespread writes to operational tables.

**Independent Test**: Populate a staging database with staged contacts containing known collisions; run the analysis; verify reported counts match ground truth and sample rows are representative.

**Acceptance scenarios**

1. **Given** staged contacts exist, **when** an operator requests duplicate-key analysis, **then** they receive aggregated collision counts keyed by normalized natural-key groups and identifiers for exemplar staged rows.
2. **Given** a staged contact exposes a federation “Member ID” custom field where applicable, **when** analysis runs, **then** mismatches between natural-key groups and differing member IDs within a group are visible in the summary or follow-on report distinction (so stewards see split-brain clusters).

---

### User Story 2 — Reconcile staged contact → player (Priority: P2)

As a platform operator, I can run a reconcile pass so each eligible staged federation contact becomes or updates one operational player, carrying the federation contact identifier as stable external linkage and aligning names, birth date, and gender policies with federation truth as defined in the domain requirements doc.

**Why this priority**: Players are the anchor entity for memberships and competitions; federation contact identity must converge without duplicates.

**Independent Test**: Seed staging with a bounded set of contacts and known target players (empty DB or fixture players); execute reconcile; verify one-to-one mapping, external key set, idempotent repeat.

**Acceptance scenarios**

1. **Given** a staged contact with no existing player linkage, **when** reconcile runs, **then** a new operational player exists with federation contact identifier stored as the authoritative external reference.
2. **Given** a staged contact matching an operational player primary key rule already agreed in domain requirements (e.g. federation contact id match), **when** reconcile runs, **then** the player is updated, not duplicated, and the outcome is repeatable on second run without drift.
3. **Given** a staged contact conflicting with operational data (duplicate natural key collision not auto-resolvable), **when** reconcile processes it, **then** the row is skipped or flagged per operator-configured conflict policy and does not silently overwrite unrelated players.

---

### User Story 3 — Reconcile staged membership → club membership (Priority: P3)

As a platform operator, I can run a reconcile pass so federation memberships reflected in staged data create or update operational club–player membership rows with correct temporal bounds and federation membership identity preserved for future runs.

**Why this priority**: Competition eligibility depends on correct membership linkage, not contacts alone.

**Independent Test**: Staged memberships linking known contacts to clubs via federation identifiers; reconcile; inspect operational memberships and re-run reconcile to prove idempotency.

**Acceptance scenarios**

1. **Given** a federation membership staged with start date and optionally end date, **when** reconcile runs, **then** the operational membership reflects equivalent validity window semantics (close vs delete semantics align with adopted policy — see Edge cases).
2. **Given** the same federation membership processed twice, **when** reconcile runs twice without upstream change, **then** operational state is unchanged aside from bookkeeping timestamps if any — no duplicate memberships for the natural federation membership identity key.

---

### Edge cases

- Staged federation contact exists but federation member ID custom field absent or malformed — classify as skip with reason versus hard failure.
- Operator runs reconcile against production without staging dry-run gate — organisational policy SHOULD require staging rehearsal; specification assumes separate environment pairing enforced by ops.
- Club or membership type referenced from federation lacks local mapping strategy — reconcile MUST fail closed for that membership row (skip + log + count) unless a deterministic mapping exists in planning.
- Two operational players collide on natural key after historical duplicate data — surface for manual merge (out of scope for automated merge unless a later story adds it).

## Requirements *(mandatory)*

### Functional requirements

- **FR-001**: The system MUST offer a duplicate-analysis capability over staged federation contacts using the federation rule that a person’s natural key combines first name, last name, and date of birth, and MUST surface totals and illustrative examples operators can act on without hand-written ad hoc queries alone.
- **FR-002**: The system MUST link each reconciled federation contact identifier to exactly one operational player per environment, honoring the domain mandate that federation contact identifier is primary external key for Twizzit (see Requirements F2.2/F2.x).
- **FR-003**: Where applicable, federation “Member ID” carried in custom-field values MUST be propagated consistently onto operational player linkage fields per domain requirements — without dropping values present in staged payloads.
- **FR-004**: Reconcile MUST be idempotent for successful rows: successive passes with unchanged inputs produce no unintended additional players or memberships.
- **FR-005**: For reconciled federation memberships in scope (per Requirements F4 on membership typing), operational club–player membership records MUST be created or updated to reflect federation start/end semantics and federation membership stable identity suitable for repeats.
- **FR-006**: Row-level faults MUST skip or escalate per configurable policy defaults (default: skip, log contextual identifiers, accumulate counts) rather than terminating the entire run — mirroring ingestion resilience expectations unless operators choose strict mode explicitly in implementation planning.
- **FR-007**: This sync capability MUST be independent of legacy XML federation import codepaths; relying on deprecated transports or legacy modules is forbidden for new implementation work.

### Key entities

- **Staged federation contact** — Authoritative federation person payload held outside operational player tables until reconcile; exposes stable federation contact identifier, demographics, typed custom-field values include federation member identifiers.
- **Staged federation membership** — Link between federation contact/club/type with temporal bounds and stable federation membership identifier.
- **Operational player** — Canonical Badminton person record acquiring federated identifiers through reconcile.
- **Operational club-player membership** — Club affiliation with validity intervals and federation membership external reference.

## Success criteria *(mandatory)*

### Measurable outcomes

- **SC-001**: On an operator-provided seeded dataset reflecting at least fifty thousand staged federation contacts — including fabricated duplicate collisions — duplicate analysis completes and produces summaries whose aggregate counts match deterministic expected totals prepared by testers (zero unexplained discrepancy bucket).
- **SC-002**: After a successful full reconcile sample run (staging), executing the identical pass again introduces **no net new players** nor **duplicate memberships** keyed on federation identities for rows previously marked succeeded (within measurement tolerance excluding explicit operator overrides introduced between runs).
- **SC-003**: Operators can classify run health using summary metrics (total candidates, succeeded, skipped, failed) plus representative failure reasons without inspecting raw payloads line-by-line.
- **SC-004**: Duplicate-analysis and reconcile flows are exercised on staging environment pairing prior to granting production operational write execution (organisational procedural gate tracked outside this spec but evidenced by rollout checklist artifact in planning/tasks).

## Assumptions

- Shadow backfill completeness for an environment pairing is satisfactory before reconcile (coverage gaps produce gaps in reconcile eligibility — acceptable visibility via counts rather than guessed fabrications).
- Membership type taxonomy mapping from federation to Badman enums is tackled within implementation planning backed by Requirements F4; ambiguous types remain skipped-not-guessing until mapping exists.
- Legal / privacy approvals for federation data staging and reconcile are already inherited from prerequisite features; nothing in this slice widens recipients of personal data beyond existing platform roles.
- GraphQL-facing admin APIs are postponed — internal operators trigger jobs via CLI / worker harness / script approved in tasks without requiring public schema changes in v1.
