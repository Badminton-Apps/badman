# Implementation Plan: Enrollment Export — REST Endpoint Migration

**Branch**: `012-enrollment-export` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/012-enrollment-export/spec.md`

## Summary

Add `GET /export/enrollment` to the existing `ExportController` in `apps/api/`.
The endpoint replaces the existing `GET /excel/enrollment` handler in
`libs/backend/competition/enrollment/` with a consistent implementation that:
- Uses the shared `buildExportPayload` helper (XLSX / CSV, correct `Content-Disposition`)
- Resolves all players in a single bulk query instead of per-player `findByPk` calls
- Skips entries with no team or unresolvable player IDs (no throw)
- Preserves the exact 12-column schema, ordering, sum-index logic, and draw-name cleaning
  from the existing service

This follows the exact same controller/service/test pattern established by specs 009–011.
No new Nx lib is created.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 (NestJS 10 on Fastify)
**Primary Dependencies**: `@nestjs/common`, `@badman/backend-database` (Sequelize models),
`@badman/backend-utils` (`toXlsx`, `toCSV`), `@badman/backend-authorization` (`@User()`),
`@badman/utils` (`IsUUID`, `SubEventTypeEnum`, `sortPlayers`)
**Storage**: PostgreSQL (read-only — no writes)
**Testing**: Jest (`npx jest --config apps/api/jest.config.ts`)
**Target Platform**: Linux server (NestJS API, port 5010)
**Project Type**: REST endpoint added to an existing NestJS web-service
**Performance Goals**: Bulk player resolution (1 query regardless of competition size)
vs. current N+1 approach
**Constraints**: `toXlsx` / `toCSV` from `@badman/backend-utils` are the only
permitted output generators; no new Nx lib
**Scale/Scope**: One competition at a time; in-memory generation consistent with all
existing export endpoints

## Constitution Check

| Principle | Applies? | Status |
|-----------|----------|--------|
| I. Code-First GraphQL via Sequelize Models | No — REST endpoint, read-only | ✅ N/A |
| II. Translation Discipline | No — no `all.json` changes | ✅ N/A |
| III. Transactional Mutations | No — read-only endpoint, no writes | ✅ N/A |
| IV. Resolver Test Discipline | Partial — service unit tests use `jest.spyOn` on model statics, `afterEach(jest.restoreAllMocks)`, no real DB | ✅ Compliant |
| V. Legacy Frontend Boundary | Reference only — existing `EnrollmentController`/`ExcelService` read for algorithm; no changes made to `libs/frontend/` | ✅ Compliant |

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-enrollment-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/
├── controllers/
│   └── export.controller.ts          # ADD: getEnrollment() handler
├── services/export/
│   ├── teams.service.ts              # Existing — untouched
│   ├── exceptions.service.ts         # Existing — untouched
│   ├── locations.service.ts          # Existing — untouched
│   ├── enrollment.service.ts         # NEW
│   └── enrollment.service.spec.ts    # NEW
└── app.module.ts                     # ADD: EnrollmentService to providers
```

**Structure Decision**: Single-app pattern. `EnrollmentService` is a plain
`@Injectable()` provider registered directly in `AppModule.providers`, identical to
`TeamsService`, `ExceptionsService`, and `LocationsService`. No new Nx lib, no new
controller.
