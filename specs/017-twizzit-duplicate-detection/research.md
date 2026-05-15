# Research: Twizzit Duplicate Detection

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-15

## R1 — Script pattern

**Decision**: Mirror `scripts/backfill-entry-meta.js` exactly — CommonJS, `pg` client, `dotenv`, `--env <staging|prod>`, `--dry-run` flags.
**Rationale**: Already reviewed, deployed to production, and understood by the team. No new dependencies — `pg` and `dotenv` already in repo.
**Alternatives considered**: NestJS CLI command — rejected (over-engineered for a one-off reporting tool).

## R2 — Primary matching: memberId

**Decision**: Primary match is `sc.member_id = p."memberId"` (exact string). `memberId` is the definitive cross-system identifier — it is the Twizzit "Member ID" extra field surfaced by the spec 015 client and stored in both `shadow_contact.member_id` and `Players."memberId"`.
**Rationale**: User confirmed memberId should not be empty and is the source of truth for player identity across systems.
**Alternatives considered**: Twizzit `twizzit_id` as primary key — not yet stored on `Players`; deferred to a later sync phase.

## R3 — Fallback matching: natural key

**Decision**: Only used when `memberId` is NULL or empty on either side. Match on `lower(sc.first_name) = lower(p."firstName") AND lower(sc.last_name) = lower(p."lastName") AND sc.date_of_birth IS NOT DISTINCT FROM p."dateOfBirth"` (the `IS NOT DISTINCT FROM` operator handles NULL = NULL correctly).
**Rationale**: Catches players whose memberId was never populated in Badman. Name+DOB is less reliable so it is strictly a fallback.
**Alternatives considered**: Fuzzy name matching — rejected (false positives; out of scope v1).

## R4 — Missing memberId flag

**Decision**: When a natural-key match is found and `sc.member_id IS NOT NULL` but `p."memberId" IS NULL`, emit `missingMemberId = true` and `suggestedMemberId = sc.member_id` on that CSV row.
**Rationale**: Allows the operator to also fix missing memberIds in a single pass, not just identify duplicates. User-specified requirement.

## R5 — Duplicate group definition

**Decision**: A duplicate group = 2+ `public."Players"` rows that both match the same `sc.twizzit_id`. The CSV output focuses entirely on Badman Players; the shadow contact is the confirmation reference only.
**Rationale**: User confirmed: "the output is about Players, shadow contacts are just the lookup."

## R6 — groupId assignment

**Decision**: Sequential integer prefixed by match reason — `MB-1`, `MB-2` … for memberId groups; `NK-1`, `NK-2` … for natural-key groups.
**Rationale**: Human-readable, easy to filter in a spreadsheet. Stable within a single run.

## R7 — Empty shadow table guard

**Decision**: `SELECT COUNT(*) FROM twizzit.shadow_contact` before any detection. Exit code 1 with clear message if 0 rows.
**Rationale**: Prevents misleading "0 duplicates" result when spec 016 has not been run (FR-007).

## R8 — No DB writes

**Decision**: Fully read-only. No DB writes at all. `--dry-run` is a no-op (preserved for CLI consistency with sibling scripts).
**Rationale**: Detection is a reporting tool; remediation is a manual operator decision.
