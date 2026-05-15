# Implementation Plan: Twizzit Duplicate Detection

**Branch**: `017-twizzit-duplicate-detection` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-twizzit-duplicate-detection/spec.md`

## Summary

Deliver a standalone Node.js script (`scripts/detect-duplicate-players.js`) that compares `twizzit.shadow_contact` (populated by spec 016) against `public."Players"` to find duplicate Badman Player records — confirmed by two or more Players matching the same Twizzit contact. Primary match is `memberId`; fallback is `firstName + lastName + DOB` when memberId is absent. Results written to a CSV. Follows the same pattern as `scripts/backfill-entry-meta.js`. Also flags Players that are missing a `memberId` when the matching shadow contact has one.

## Technical Context

**Language/Version**: Node.js 20+ (CommonJS — same as `backfill-entry-meta.js`)
**Primary Dependencies**: `pg`, `dotenv` — both already in repo; no new packages
**Storage**: Read-only — `twizzit.shadow_contact` (spec 016), `public."Players"` (existing). No DB writes.
**Testing**: Manual validation against staging; no automated unit tests for a one-off reporting script
**Target Platform**: Developer / operator workstation (local CLI)
**Project Type**: Standalone operational script
**Performance Goals**: Full scan under 5 minutes for ≤200k shadow contacts and ≤50k Players (SC-001)
**Constraints**: Fully read-only; exits with clear error if shadow tables empty
**Scale/Scope**: Single script file ~250–350 lines

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Verdict | Notes |
|-----------|----------|---------|-------|
| I. Code-First GraphQL via Sequelize Models | **No** | PASS by non-applicability | No persistent entity, no Sequelize model, no GraphQL `@ObjectType`. Reads via `pg` directly. |
| II. Translation Discipline (NON-NEGOTIABLE) | **No** | PASS by non-applicability | No `all.json` keys. All output is operator-facing console + CSV. |
| III. Transactional Mutations | **No** | PASS by non-applicability | No GraphQL mutations. Script is read-only. |
| IV. Resolver Test Discipline | **No** | PASS by non-applicability | No resolvers. Validation is manual against staging. |
| V. Legacy Frontend Boundary (NON-NEGOTIABLE) | **No** | PASS by non-applicability | No frontend code touched. |

**Result**: No violations. No Complexity Tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/017-twizzit-duplicate-detection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — source tables and CSV schema
├── quickstart.md        # Phase 1 output — usage guide
├── contracts/
│   └── queries.md       # Phase 1 output — SQL query contracts
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
scripts/
└── detect-duplicate-players.js    # New script (mirrors backfill-entry-meta.js)
```

No new lib, no new NestJS module, no migrations.

## Phase 0: Research

See [research.md](research.md) — all decisions resolved, no unknowns remaining.

## Phase 1: Design

See [data-model.md](data-model.md), [contracts/queries.md](contracts/queries.md), [quickstart.md](quickstart.md).
