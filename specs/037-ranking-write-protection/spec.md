# Feature Specification: Ranking Write Protection — Single Sanctioned Writer

**Feature Branch**: `037-ranking-write-protection`
**Created**: 2026-06-11
**Status**: Draft
**Input**: User description: "Ranking write refactor: single sanctioned writer service so stored rankings are always rule-compliant (BAD-231/BAD-264/BAD-265/BAD-266). Stored player rankings must always satisfy the Badminton Vlaanderen derivation rule; remove the need for read-time compensation patches."

## Problem Statement

Player rankings (three categories: singles, doubles, mixed) are imported from the official federation source. Players who do not compete in a category get no value from the source. Federation rules say such a category must be **derived**: at most a fixed number of levels (the system's max-diff setting, currently 2) below the player's best category, capped at the system's worst level.

Today no import or edit path enforces this rule when rankings are **stored**. Stored records contain missing or rule-violating values; the repair mechanism that should fix them is broken in two independent ways. Instead, the rule is re-applied in 9+ separate places when data is **displayed**, and one validation flow re-implements the rule with a hardcoded constant. Consumers that read stored data directly (spreadsheet exports, tournament-software exports, average-level reports, one API field) show wrong values — the long-running "impossible ranking" complaints — and an administrator manually corrects records every season.

## Clarifications

### Session 2026-06-11

- Q: Enrollment ghost player (no ranking record at all) — keep current uncapped worstLevel+2 (=14, BV-validator parity) or unify on the shared rule's cap at worstLevel (=12)? → A: Cap at 12 — fully unify on the shared rule.
- Q: Administrator create/edit with rule-violating values — clamp silently, reject with error, or clamp + report adjustments? → A: Silently clamp, same semantics as imports.
- Q: Release B observation window given publications land only every ~2 months — wait for next publication, 1–2 weeks of normal ops, or immediate? → A: Wait for the next federation publication to sync through the new writer, re-verify invariant = 0, then delete patches.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Stored rankings are always rule-compliant (Priority: P1)

When rankings are imported from the federation source (bulk publication import, per-player repair check, file upload) or edited by an administrator, the stored record always has all three category values present and within the allowed spread, derived per federation rules when the source provides no value — **without discarding a player's previously known official value** for a category that simply wasn't in this import.

**Why this priority**: This is the root cause. Every downstream symptom (wrong exports, validation failures, manual corrections) stems from non-compliant stored data.

**Independent Test**: Import a publication where a player appears only in the singles list; verify the stored record keeps the player's previously known doubles/mixed values (or derives them when none exist) and violates no spread rule.

**Acceptance Scenarios**:

1. **Given** a player with existing rankings (singles 5, doubles 5, mixed 6), **When** a publication import contains only the player's singles value, **Then** the stored record keeps doubles 5 and mixed 6 (previous known values are not overwritten with derived ones).
2. **Given** a brand-new player appearing only in the singles list at level 6, **When** the import runs, **Then** doubles and mixed are stored as 8 (best + 2), and never beyond the system's worst level.
3. **Given** an administrator creates or edits a ranking record leaving a category empty or exceeding the allowed spread, **When** the record is saved, **Then** the stored values are silently filled/clamped per the rule — identical semantics to imports, no validation error returned.
4. **Given** any import or edit completes, **Then** the "latest ranking" snapshot record for the player reflects the same compliant values.

---

### User Story 2 - Broken repair pipeline works again (Priority: P1)

The per-player repair check (triggered for players with incomplete rankings) actually repairs them: it processes players found through either lookup route, accepts partial results (any category found), preserves last known values for categories not found, derives the rest, and receives correct player references from the import step that queues it.

**Why this priority**: The repair pipeline is the designed self-healing mechanism and is currently broken twice over (a lookup branch that never yields results, and the queueing step passing the wrong identifier). Without it, incomplete data can never self-correct.

**Independent Test**: Queue a repair job for a player whose source page lists only two categories; verify the stored record afterwards is complete and compliant.

**Acceptance Scenarios**:

1. **Given** a repair job for a player found via the ranking-page route, **When** the job runs, **Then** the scraped values are actually used (the route no longer dead-ends).
2. **Given** a scrape finds only one of three categories, **When** the job completes, **Then** the missing categories come from last known stored values, else derivation; the job only skips when zero categories are found.
3. **Given** the import step detects players with incomplete rankings, **When** it queues repair jobs, **Then** each job carries the correct player identifier (not the ranking-record identifier).

---

### User Story 3 - Existing stored data repaired (Priority: P2)

All historical ranking records (current and snapshot tables) are repaired in one pass: previously published values carried forward per player/category, remaining gaps derived, spreads clamped — so direct-read consumers (exports, reports) immediately show correct values for old data too.

**Why this priority**: Write-time enforcement only protects new data; the years of stored violations behind the "impossible ranking" exports must be fixed once.

**Independent Test**: After the repair pass, a data-quality count of records violating the rule (missing value, spread exceeded, beyond worst level) returns zero for all configured systems.

**Acceptance Scenarios**:

1. **Given** historical records with missing categories, **When** the repair pass runs, **Then** each missing value is filled with the player's most recent earlier value for that category when one exists, otherwise derived per the rule.
2. **Given** the repair pass completed, **When** the invariant count query runs over both the history and snapshot tables, **Then** it returns zero violations.
3. **Given** the repair pass, **When** it runs against production-scale data (millions of records), **Then** it proceeds in bounded batches without blocking normal operation.

---

### User Story 4 - One rule, one implementation (Priority: P2)

Team-enrollment validation derives missing player levels using the same shared rule and the system's configured max-diff value, instead of its own hardcoded "+2" copy. A future federation rule change is a single-place configuration/implementation change.

**Why this priority**: Divergent copies silently disagree the moment the rule changes; the frontend's copy was already removed for this reason (BAD-119).

**Independent Test**: Run the enrollment index calculation test suite with the system's max-diff explicitly configured to 2; all outcomes are unchanged.

**Acceptance Scenarios**:

1. **Given** a player with a missing category during enrollment validation, **When** the team index is calculated, **Then** the fallback level comes from the shared rule using the system's configured max-diff value.
2. **Given** the existing enrollment validation test fixtures (max-diff = 2), **When** the suite runs, **Then** all current outcomes are preserved — except the player-with-no-record case, whose fallback becomes the system's worst level (capped) instead of worst+2.

---

### User Story 5 - Read-time patches removed (Priority: P3)

After stored data is verified compliant (write-time enforcement live plus one full import cycle observed clean), the 9 display-time compensation patches are deleted. API consumers receive stored values directly, and stored values equal displayed values everywhere.

**Why this priority**: The payoff and the proof: deleting compensation code is only safe once the source data is trustworthy; keeping it one release longer as a safety net costs nothing.

**Independent Test**: With patches removed, compare API-returned ranking values against raw stored values for a sample of players including former problem cases — identical.

**Acceptance Scenarios**:

1. **Given** the invariant count is zero and the next bimonthly federation publication has synced cleanly through the new write path, **When** the patches are removed, **Then** all ranking displays and the formerly-unpatched direct-read paths (team base players field, spreadsheet exports, average-level report) show rule-compliant values.
2. **Given** a former "impossible ranking" case, **When** its export is regenerated, **Then** the values match the rule and match what the API displays.

### Edge Cases

- **Zero categories found by repair scrape**: keep current skip behavior (cannot derive from nothing; likely scrape failure or unknown player).
- **Previously known category absent from a new publication**: prefer the last known stored value over derivation (a stale official value beats a guessed one); derivation only when no prior value exists.
- **Ranking system without configured rule values** (max-diff or level count missing): the sanctioned writer must refuse loudly (fail the write) rather than store unverifiable data; the safety-net layer must skip silently (warn) so unrelated writes don't break. Pre-flight: verify all production systems have both values configured before rollout.
- **Repair pass irreversibility**: derived values are indistinguishable from official ones afterwards; accepted (the gaps were never meaningful). If the max-diff setting ever changes, the repair pass can be re-run.
- **Detection query for incomplete rankings goes quiet**: the import step's "find records with missing categories" safety net will find nothing once writes are compliant — keep it as a tripwire detector; it alerting again would indicate a writer bypassing the rule.
- **Enrollment snapshots**: player levels frozen into historical enrollment records at enrollment time are not retroactively changed; future enrollments produce compliant snapshots.
- **Per-game ranking snapshots**: already rule-compliant at write time today; out of scope except confirming no regression.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST enforce the federation derivation rule (missing category → derived; spread clamped to best + system max-diff; all values capped at the system's worst level) at the moment ranking records are stored, for every write path: bulk publication import, per-player repair check, ranking file upload, administrator create/edit, and the internal calculation pipeline.
- **FR-002**: All ranking-record write paths MUST go through a single sanctioned write component; direct writes outside it MUST be prevented by automated tooling (build-time check) plus a last-resort storage-layer safeguard that clamps values without breaking unrelated writes.
- **FR-003**: When an import provides values for only some categories of a player who has previously stored values, the write MUST preserve the previously known values for the absent categories rather than overwrite them with derived values.
- **FR-004**: The "latest ranking" snapshot MUST be kept consistent with the newest stored ranking record by the sanctioned write component itself (no reliance on implicit side effects).
- **FR-005**: The per-player repair check MUST process players found via either lookup route, MUST proceed when at least one category is found, MUST fill absent categories from last known values before derivation, and MUST skip only when zero categories are found.
- **FR-006**: The import step that queues repair jobs MUST pass the player identifier (not the ranking-record identifier) and MUST issue the detection query correctly scoped.
- **FR-007**: A one-time repair pass MUST fix all existing ranking records (history and snapshot tables) for every system with configured rule values: carry forward each player's most recent earlier value per category, then derive/clamp the remainder. It MUST run in bounded batches and MUST NOT trigger per-record side effects.
- **FR-008**: Enrollment index calculation MUST source its missing-level fallback from the shared rule and the system's configured max-diff value; the hardcoded constant is removed. Players with no ranking record at all are capped at the system's worst level (full unification with the shared rule; the previous uncapped worst+2 "validator parity" value is intentionally abandoned). All other validation outcomes MUST be preserved with max-diff configured at the current value; the one test expectation covering the no-record case changes accordingly.
- **FR-009**: A verifiable invariant (count of stored records violating the rule) MUST be defined and MUST gate the removal of the display-time patches: removal happens only after the count is zero AND the next federation publication (bimonthly cadence) has synced through the new write path with the invariant still zero.
- **FR-010**: After the gate passes, all 9 display-time compensation call sites MUST be removed, and stored values MUST equal API-returned values.
- **FR-011**: Before rollout, every production ranking system MUST be verified to have both rule settings (level count, max-diff) configured; gaps are fixed first.
- **FR-012**: Linear issues BAD-231/BAD-264 MUST be updated to reflect the corrected problem analysis (bulk import is the primary source of missing values; the repair pipeline was broken twice; naive per-writer patching would overwrite known values).

### Key Entities

- **Ranking record**: a player's levels in three categories at a publication date, within one ranking system; carries per-category points/rank and inactivity flags; the table behind all symptoms.
- **Latest-ranking snapshot**: one record per player/system mirroring the most recent ranking record; consumed by team validation, game creation, exports.
- **Ranking system**: configuration owner — number of levels, max allowed spread (max-diff), calculation parameters. The rule's parameters live here.
- **Repair job**: queued unit of work that re-scrapes one player's ranking from the source to fix incomplete records.
- **Enrollment snapshot**: player levels frozen into a team's enrollment record at enrollment time; produced by enrollment validation, consumed by exports.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Invariant query (records missing a category value, exceeding the allowed spread, or beyond the worst level) returns **0** across both ranking tables for all configured systems — immediately after the repair pass and again after the next bimonthly federation publication sync.
- **SC-002**: Stored values equal displayed values: for any sampled player, the API response and the raw stored record agree on all three categories (today they can differ; after patch removal they cannot).
- **SC-003**: Formerly wrong direct-read outputs (assembly spreadsheet export, average-level report, team base-players field, tournament-software export for new enrollments) show rule-compliant values without any new compensation code being added to them.
- **SC-004**: Manual ranking corrections by the administrator for missing/derived categories drop to zero in the season following rollout.
- **SC-005**: The repair queue processes jobs successfully (jobs no longer fail on wrong identifiers or dead lookup branches); incomplete-record detection after an import finds nothing to queue.
- **SC-006**: A future change to the max-diff setting requires changing exactly one configured value and re-running the repair pass — no code changes across consumers.

## Assumptions

- Overwriting stored gaps with derived values is acceptable; no need to distinguish derived from official values afterwards (epic's explicit choice; derivation is deterministic and re-runnable).
- The current max-diff value is 2 and the worst level is 12 for the primary system; the rule must nonetheless read configuration, not constants.
- Two-release rollout: enforcement + repair first, patch deletion second, gated by the invariant (user-confirmed).
- Historical enrollment snapshots are not retroactively repaired (out of scope; acceptable).
- The dormant internal calculation pipeline (BAD-261) already applies the rule and is out of scope beyond routing its writes through the sanctioned component for consistency.
- Per-game ranking snapshots are already compliant at write time and stay as-is.
- The detailed technical plan (component design, file-level inventory, batched repair approach, invariant query) exists at `/Users/arno/.claude/plans/check-this-epic-and-giggly-abelson.md` and feeds `/speckit.plan`.
