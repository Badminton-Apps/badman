# Feature Specification: Unify Base-Index Calculation in the Backend

**Feature Branch**: `006-unify-base-index-backend`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Unify baseIndex / teamIndex calculation by exposing a backend service so the new frontend stops reimplementing the formula. Context: Index = team strength score (lower is stronger). Today the canonical formula lives in `@badman/utils.getIndexFromPlayers` and is used by backend enrollment validation, by the entry-model recalculation hook, and by the legacy Angular frontend. The new Next.js frontend reimplements the formula locally (`calculateBaseIndex`) and diverges from the canonical version (BAD-119, spec 010-fix-base-index-formula). Goal: expose the canonical calculation through the backend API, have the new frontend consume it, and retire the duplicated frontend formula."

## Clarifications

### Session 2026-05-02

- Q: Authorization model for the new calculation operation? → A: Require authentication only (any logged-in user); no fine-grained permission check.
- Q: How should the batched operation behave when some inputs fail? → A: Per-input results — each entry returns either a value or a structured per-input error; the overall request still succeeds.
- Q: Does the new operation cover team-index as well as base-index, or only base-index? → A: One operation covers both; input may be a list of player IDs (base-index style) or a list of pre-resolved per-player ranking objects (team-index style); same response shape.
- Q: Backend caching policy for repeated calculations? → A: Short-lived per-process / request-scoped dedupe (within a batch plus a brief TTL of at most 60 s). No shared cross-request cache.
- Q: Should the entry-model recalculation hook switch to the new operation's underlying service? → A: Yes — extract snapshot-fetch + calculation into a shared backend service; both the new public operation and the entry-model hook call it. Hook keeps its Sequelize-lifecycle trigger.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Club admin sees an index value that always matches the backend (Priority: P1)

A club administrator opens the enrollment team dialog, selects base players, and sees a base-index number that determines which sub-events (divisions) the team is eligible to enter. The number shown is produced by the same authoritative source the backend uses to validate the submission, so the admin never sees a "team-too-weak" or "team-too-strong" rejection on a team the dialog presented as eligible.

**Why this priority**: This is the user-visible pain point that drives the entire feature. Every divergence between the displayed index and the validated index causes a submission that fails for reasons the admin cannot diagnose. Solving this removes the support burden and unblocks confident self-service enrollment.

**Independent Test**: In the enrollment dialog, configure several teams with varied base-player selections (4 fully ranked players, 2 of 4, partial component rankings, MX with mixed gender, more than 4 selected). For each, read the displayed base index, submit, and confirm the backend accepts the same eligibility decisions the dialog showed.

**Acceptance Scenarios**:

1. **Given** a men's team with 4 base players each ranked single=8, double=8, **When** the dialog shows the base index, **Then** the value equals 64 (4 × (8+8)) and the backend validates the same value when the team is submitted.
2. **Given** a men's team with only 2 base players (each single=8, double=8), **When** the dialog shows the base index, **Then** it equals 80 (2×16 + 2×24 missing-player penalty), matching the backend.
3. **Given** an MX team with 3 men and 1 woman selected, **When** the dialog shows the base index, **Then** it picks the best 2 men plus the 1 woman + 1 missing-female penalty (36) and the backend produces the same number on submit.
4. **Given** a player whose ranking has no doubles component, **When** the dialog shows the base index, **Then** that player contributes single + 12 (default), matching the backend.

---

### User Story 2 — One canonical formula, no drift (Priority: P1)

The platform team owns a single authoritative implementation of the team-strength formula. Any change (snapshot date, missing-component default, MX gender split, penalty weights) is made in one place and propagates automatically to every consumer (enrollment dialog, entry-model recalculation, validation rules, ranking-aware reporting). New consumers cannot accidentally introduce a divergent copy of the formula.

**Why this priority**: The current divergence between backend and the new frontend is the root cause of BAD-119 and similar issues. Without consolidating the calculation behind a single API surface, every future change risks a new round of cross-repo drift. This is foundational for Story 1 to stay true over time.

**Independent Test**: Search the new-frontend codebase for any local implementation of the index formula after the rollout. The search MUST return zero hits. Change a single rule (for example, the missing-player penalty) in the canonical implementation and verify that all consumers (legacy frontend, new frontend, backend validation, recalculation hook) reflect the change without per-consumer code edits.

**Acceptance Scenarios**:

1. **Given** the canonical formula is updated (e.g., default for missing components changes from 12 to another value), **When** the change is deployed to the backend, **Then** every consumer (new frontend dialog, backend validation, entry recalculation, legacy frontend) returns the new value with no additional code change in those consumers.
2. **Given** the new frontend is built after this feature ships, **When** the codebase is grep-audited for local index-calculation logic, **Then** no duplicate implementation of the formula remains.

---

### User Story 3 — Live, responsive enrollment UX while the backend owns the math (Priority: P2)

A club admin adds and removes base players in the enrollment dialog and sees the base index update without perceptible lag, even though the calculation now happens server-side. The dialog handles loading and error states gracefully (placeholder while loading, error indicator if the backend cannot return a value), so the admin always knows whether the displayed number is trustworthy.

**Why this priority**: Moving the calculation to the backend introduces a network round-trip per change. Without thoughtful UX, the dialog can feel sluggish or display stale numbers. This story protects the user experience that motivated keeping the calculation client-side originally.

**Independent Test**: Open the enrollment dialog and add/remove base players in rapid succession across several teams on the same screen. Verify that (a) the displayed index updates within an acceptable interaction budget, (b) intermediate states show a non-numeric placeholder rather than stale numbers, (c) failures show an error indicator with no numeric value, and (d) the network is not flooded with one request per keystroke.

**Acceptance Scenarios**:

1. **Given** the admin changes the base-player selection of a team, **When** the dialog requests a new index, **Then** the displayed value updates within the responsiveness target defined in Success Criteria SC-003 under nominal network conditions.
2. **Given** multiple teams are visible on the same screen, **When** any of their base-player selections change, **Then** the dialog batches the calculations into a single backend round-trip rather than issuing one request per team per change.
3. **Given** the backend cannot return a value (network error, ranking data unavailable), **When** the dialog renders the index field, **Then** a non-numeric error indicator with an explanatory tooltip is shown and no stale or zero value is displayed.
4. **Given** the calculation is in flight, **When** the dialog renders the index field, **Then** a placeholder (spinner or dash) is shown and the field is announced via an `aria-live="polite"` region for screen-reader users.

---

### User Story 4 — Existing backend consumers and legacy frontend keep working (Priority: P2)

Backend services that already use the canonical formula (enrollment validation, entry-model `BeforeCreate` / `BeforeUpdate` recalculation, assembly validation rules, the recalculate-entry-index maintenance script) continue to function with no behavioral change. The legacy Angular frontend, which already reads the canonical helper directly, is unaffected by this work and is explicitly out of scope.

**Why this priority**: Refactoring how the calculation is exposed must not introduce regressions in tooling that already produces correct numbers today. This story scopes out the legacy Angular frontend (which is reference-only per repository policy) and locks the contract for current backend callers.

**Independent Test**: Run the existing enrollment-validation and entry-recalculation test suites and the recalculate-entry-index maintenance script against representative data; confirm the resulting `teamIndex` and validation outcomes are byte-identical to the pre-change baseline for the same input.

**Acceptance Scenarios**:

1. **Given** the existing backend test suites covering enrollment validation, entry recalculation, and assembly validation, **When** the feature is merged, **Then** every test produces the same numeric `teamIndex` and the same pass/fail outcome it produced before the change.
2. **Given** the recalculate-entry-index maintenance script is run against a snapshot database, **When** it completes, **Then** every recomputed `teamIndex` matches the value produced by the pre-change implementation.

---

### Edge Cases

- The admin selects more than 4 base players for a men's or women's team. The calculation must select the best 4 (lowest single+double sum) and ignore the rest, matching the canonical formula.
- The admin selects more than 4 base players for an MX team with an unbalanced gender split (e.g., 4 men, 1 woman). The calculation must select the best 2 men and best 2 women available, applying a missing-player penalty if fewer than 2 of either gender exist.
- A selected player has a ranking row but one or more components (single, double, mix) are null. Each missing component must default to 12 (or to the configured "amount of levels" for the active ranking system).
- A selected player has no ranking row at all on or before the snapshot date. The player must be treated as fully unranked (all components default to 12 / amount of levels), not silently skipped.
- The relevant ranking snapshot date is the same date the backend already uses for validation; the dialog must not use a different snapshot than the backend.
- The ranking system identifier is not yet known when the dialog mounts. The index field shows a non-numeric placeholder until the system is resolved; it must never show a zero or stale value.
- The backend returns an error or times out. The index field shows a clear error indicator with a tooltip; no numeric value is shown.
- A team's base-player selection changes very rapidly (e.g., the admin types or clicks repeatedly). The dialog batches and/or debounces requests so the network is not flooded.
- Multiple teams are open at once. The dialog issues a single batched calculation request for all teams whose inputs changed in the same interaction window.

## Requirements *(mandatory)*

### Functional Requirements

#### Canonical service surface

- **FR-001**: The platform MUST expose a single backend operation that, given (a) a team type (M / F / MX), (b) a player set, (c) the season, and (d) the active ranking system, returns the index value, the list of players that contributed to it, and the count of missing players that incurred a penalty. The "player set" input MUST support both calculation modes the platform needs:
  - **Base-index mode**: the input is a list of player identifiers (proposed base players). The backend resolves each player's ranking from the snapshot itself.
  - **Team-index mode**: the input is a list of pre-resolved per-player ranking objects (player identifier plus optional `single`, `double`, `mix` values). For each player, any component the caller supplies is used as-is; any component the caller omits is filled from the snapshot. This is the input shape the entry-model recalculation hook needs.
  The response shape MUST be identical for both modes; the operation MUST NOT split into two divergent surfaces.
- **FR-002**: The backend operation MUST accept a batch of independent calculation inputs in a single call and return one result per input, so a screen with multiple teams can be updated in one round-trip.
- **FR-002a**: The batched operation MUST return per-input results: each entry in the response corresponds to exactly one input and carries either (a) a successful payload (base index, contributing players, missing-player count) or (b) a structured per-input error describing why that single calculation could not be produced (e.g., player not found, ranking snapshot unavailable). A failure on one entry MUST NOT cause the overall request to fail; the operation MUST still return successful results for the remaining entries. Each input MUST be correlatable with its result via a caller-supplied key (or input order) so the frontend can render per-team success or error indicators per FR-011.
- **FR-003**: The backend operation MUST resolve player rankings using the same snapshot rules already used by the canonical backend recalculation logic (snapshot date derived from the event's configured ranking unit and amount, filtered to ranking rows marked as eligible for use).
- **FR-004**: The backend operation MUST default any missing ranking component (single, double, mix) to the active ranking system's "amount of levels" value, matching the canonical formula.
- **FR-005**: The backend operation MUST apply the missing-player penalty rule of the canonical formula: for non-MX teams, (4 − selected count) × 24; for MX teams, (4 − selected count) × 36, where "selected count" reflects the canonical selection (best 4 for non-MX, best 2 men + best 2 women for MX).
- **FR-006**: The backend operation MUST be the single source of truth for new consumers: any new caller (frontend, worker, script) that needs a base or team index value MUST obtain it from this operation rather than reimplementing the formula.
- **FR-006a**: The backend operation MUST require an authenticated caller. It MUST NOT be exposed to anonymous callers, but MUST NOT enforce any additional fine-grained permission check (e.g., per-club or per-team gating) — any logged-in user is a valid caller. Unauthenticated requests MUST be rejected with the platform's standard authentication error.

#### New frontend integration

- **FR-007**: The new frontend's enrollment team dialog MUST obtain the base index by calling the backend operation defined in FR-001/FR-002 and MUST NOT contain a local implementation of the formula.
- **FR-008**: The new frontend MUST batch base-index requests so that, when multiple teams change in the same interaction window, only one backend call is issued for that window.
- **FR-009**: The new frontend MUST debounce or otherwise rate-limit rapid input changes so that a single team's index calculation does not generate one request per keystroke or per click.
- **FR-010**: While a base-index calculation is in flight or its inputs are not yet resolvable (for example, the active ranking system identifier is not yet known), the dialog MUST display a non-numeric placeholder (spinner or dash) for the index — never a numeric value — and MUST announce state changes via an `aria-live="polite"` region.
- **FR-011**: When the backend operation fails or returns no value, the dialog MUST display a clear error indicator (warning icon with an explanatory tooltip) for the index field and MUST NOT display a numeric value (no zero, no stale value).
- **FR-012**: The new frontend MUST also use the backend operation (or a direct equivalent of its component-default rule) for any UI that displays per-player index contributions on the team formation page; no UI in the new frontend may compute a player's effective ranking with a local default different from the canonical one.

#### Backend consumer compatibility

- **FR-013**: The existing backend consumers of the canonical formula (enrollment validation, entry-model recalculation hook, assembly validation rules, recalculate-entry-index maintenance script) MUST continue to produce the same numeric results for the same inputs after the refactor — i.e., no behavioral change for current callers.
- **FR-014**: The canonical formula's helper module (the shared utility currently exported as `getIndexFromPlayers`) MUST remain callable by backend consumers that already depend on it, either directly or via a thin internal service that wraps it.
- **FR-014a**: The snapshot-fetch + index-calculation glue currently inlined in the entry-model `BeforeCreate` / `BeforeUpdate` recalculation hook MUST be extracted into a shared backend service. The new public operation (FR-001) and the entry-model recalculation hook MUST both delegate to that single service. The hook keeps its Sequelize lifecycle trigger and its existing input-construction logic, but it MUST NOT hold its own copy of the ranking-fetch + formula glue after this feature ships. Per FR-013/SC-006, the resulting `teamIndex` values MUST remain byte-identical to the pre-change baseline for all existing inputs.
- **FR-015**: The legacy Angular frontend (reference-only per repository policy) is explicitly out of scope; no changes to it are required by this feature, and any of its calls to the canonical helper that remain in the codebase MAY be left untouched.

#### Verification & observability

- **FR-016**: The platform MUST include automated tests that, for every non-trivial input shape (4 fully ranked, fewer than 4 selected, partial component rankings, no ranking row, MX with imbalanced gender, more-than-4 selected), produce identical results from the backend operation and from a direct call to the canonical helper.
- **FR-016a**: The canonical helper itself MUST have a pinned, exhaustive test suite covering happy paths (M / F / NATIONAL / MX), best-N selection, missing-player penalty ladders for both non-MX (×24) and MX (×36), default-fill behavior for missing components (including a custom `defaultRanking` value to pin that the missing-player penalty stays hardcoded at 24/36 and does not scale), sort/determinism properties, MX gender-filter semantics (silent drop of un-gendered players in MX vs. the explicit throw on `lastRanking`-shaped input without gender), empty-array edge cases, and the cross-equivalence `getBestPlayersFromTeam(...).index === getIndexFromPlayers(...)`. This suite is the **parity oracle** for the new shared service: the service's tests MUST loop the same `(type, players, defaultRanking)` matrix through the service path and assert byte-identical numeric results. The current oracle is implemented at [`libs/utils/src/lib/get-index.spec.ts`](../../libs/utils/src/lib/get-index.spec.ts) (37 cases as of feature inception).
- **FR-016b**: When the new shared backend service (FR-014a) is introduced, its test suite MUST include a parity test that, for each input shape in the canonical-helper oracle (FR-016a), produces a numeric result equal to the helper's result. New helper test cases added in the future MUST automatically flow through the service-level parity test (e.g., via shared fixtures), so the matrices cannot drift.
- **FR-016c**: The new frontend's enrollment dialog MUST include automated tests that, for the same set of inputs as the canonical-helper oracle (FR-016a), assert the displayed base index equals the value the backend operation returns for that input. Mocking the backend response in those tests is acceptable; the canonical numeric values used as the mock-response source MUST be derived from the helper oracle to avoid hand-copied magic numbers.
- **FR-017**: The backend operation MUST log or otherwise expose enough information to diagnose a single mismatch in production: at minimum, the team type, the player identifiers, the per-player resolved ranking values, the selected best-N subset, and the missing-player penalty applied.
- **FR-018**: The backend operation MAY dedupe identical calculation inputs within a single request (so a batch with repeated keys does not re-fetch ranking data per occurrence) and MAY apply a short-lived per-process cache for resolved ranking snapshots with a time-to-live of at most 60 seconds. The operation MUST NOT use a cross-request or cross-instance shared cache for computed index results, to avoid reintroducing the snapshot/validation drift this feature exists to prevent.

### Key Entities *(include if feature involves data)*

- **Base Index**: A numeric score derived from the resolved rankings of the selected base players. Determines which sub-events a team is eligible to enter. Lower is stronger. Single canonical formula across all consumers.
- **Team Index**: The same numeric score computed from a team's full enrolled-players meta (rather than from the base-player selection). Used by enrollment and assembly validation rules. Produced by the same canonical formula.
- **Base Player Selection**: An ordered or unordered set of player identifiers proposed as the core roster for a team during enrollment. Together with team type, this is the input to the index calculation.
- **Ranking Snapshot**: The set of player ranking values valid on or before the snapshot date for the active season and ranking system. Determines what numbers go into the formula. Same source for the backend operation, validation, and recalculation.
- **Ranking System**: Configuration record that defines, among other things, the "amount of levels" used as the default for missing ranking components. Implicit input to every calculation.
- **Sub-event**: A competitive division within a ranking system, with a minimum and maximum allowed base index. A team is eligible to enter a sub-event if and only if its base index falls within that range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After rollout, 100% of enrollment submissions for which the dialog showed a sub-event as eligible succeed without a "team-too-weak" or "team-too-strong" rejection caused by a base-index mismatch between dialog and validation.
- **SC-002**: The new frontend codebase contains zero local implementations of the index formula after rollout, as verified by an automated audit (for example, a CI grep that fails the build if a banned formula pattern reappears).
- **SC-003**: In the enrollment dialog under nominal network conditions, the base index reflects the latest base-player selection within an interaction budget that feels live to the admin (target: 95th-percentile update within 500 ms of the last input change in a debounce window of at most 300 ms).
- **SC-004**: When N teams on the same screen change in the same interaction window, the dialog issues at most one base-index calculation request, regardless of N.
- **SC-005**: For every input shape covered by the verification tests, the backend operation and the canonical helper produce identical results — zero divergences across the full test matrix. The test matrix MUST include at minimum every case currently in the helper oracle (FR-016a, today: 37 cases at [`libs/utils/src/lib/get-index.spec.ts`](../../libs/utils/src/lib/get-index.spec.ts)) and any subsequent additions to it.
- **SC-006**: All existing enrollment-validation, entry-recalculation, and assembly-validation tests pass unchanged after the refactor; the recalculate-entry-index maintenance script produces results byte-identical to the pre-change baseline on a representative dataset.
- **SC-007**: Support tickets attributable to "the dialog said my team was eligible but submission was rejected for index reasons" drop to zero in the first full enrollment window after rollout.

## Assumptions

- The canonical formula and its missing-player / missing-component / MX-gender-split rules remain as currently implemented in the shared utility; this feature unifies the *exposure* of the formula, not its definition. Any redefinition of rules is out of scope and would be a separate feature.
- The backend already has access to the data needed to resolve player rankings for the snapshot date used in validation; no new data sources are required.
- The new frontend's enrollment dialog is online-only in practice; offline / draft computation of the base index without backend access is not a supported scenario.
- The ranking-system identifier and the season are available in the dialog context (or resolvable from existing context) at the time the index is requested. While they are not, the dialog shows a placeholder per FR-010.
- The backend GraphQL surface is the appropriate integration point for the new frontend (consistent with how the new frontend already retrieves player and team data). The exact operation name and shape are an implementation detail finalized during planning, not a stakeholder decision.
- The legacy Angular frontend is reference-only and excluded from the scope per the repository's `AGENTS.md` policy. Any duplicate logic that exists in legacy frontend code is not required to be removed by this feature.
- Per-player index display rules outside the enrollment dialog and team formation page (for example, historical reporting or admin tools) are not in scope for this feature; if they are later found to diverge from the canonical formula, they can be addressed under the same canonical-source pattern in a follow-up.
- The current behavior of the entry-model `BeforeCreate` / `BeforeUpdate` recalculation hook is correct and is the de-facto reference for snapshot-date and ranking-fetch semantics; the new backend operation should align with it rather than reinvent these semantics.
