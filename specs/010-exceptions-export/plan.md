# Implementation Plan: Exceptions Export — Backend Endpoint

**Branch**: `010-exceptions-export` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-exceptions-export/spec.md`

## Summary

Add `GET /export/exceptions` to the existing `ExportController` in `apps/api/`. The
endpoint returns a deduplicated XLSX or CSV file of all location exceptions (unavailable
dates) for clubs enrolled in a competition. Core logic: traverse
`EventCompetition → SubEventCompetitions → DrawCompetitions → EventEntries → Team → Club → Location → Availability → exceptions`, expand each `{ start, end }` date range
into one row per calendar day, format dates as `DD/MM/YYYY` in `Europe/Brussels`, and
deduplicate rows by the composite key `(clubId, locationName, date)`.

This follows the exact same controller/service/test pattern established by spec 009
(teams export). No new Nx lib is created.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 (NestJS 10 on Fastify)
**Primary Dependencies**: `@nestjs/common`, `@badman/backend-database` (Sequelize models),
`@badman/backend-utils` (`toXlsx`, `toCSV`), `@badman/backend-authorization` (`@User()`),
`@badman/utils` (`IsUUID`)
**Storage**: PostgreSQL (read-only for this feature — no writes)
**Testing**: Jest (`npx jest --config apps/api/jest.config.ts`)
**Target Platform**: Linux server (NestJS API, port 5010)
**Project Type**: REST endpoint added to an existing NestJS web-service
**Performance Goals**: Matches existing export endpoints — synchronous in-memory XLSX/CSV
generation; no streaming required at expected data volumes
**Constraints**: Dates MUST be rendered in `Europe/Brussels` regardless of server locale;
`toXlsx` / `toCSV` from `@badman/backend-utils` are the only permitted output generators
**Scale/Scope**: One competition at a time; in-memory generation consistent with all
existing export endpoints

## Constitution Check

| Principle | Applies? | Status |
|-----------|----------|--------|
| I. Code-First GraphQL via Sequelize Models | No — REST endpoint, read-only | ✅ N/A |
| II. Translation Discipline | No — no `all.json` changes | ✅ N/A |
| III. Transactional Mutations | No — read-only endpoint, no writes | ✅ N/A |
| IV. Resolver Test Discipline | Partial — service unit tests use `jest.spyOn` on model statics, `afterEach(jest.restoreAllMocks)`, no real DB | ✅ Compliant |
| V. Legacy Frontend Boundary | Reference only — legacy `ExcelService.getExceptionsExport` is read for algorithm; no changes made to `libs/frontend/` | ✅ Compliant |

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/010-exceptions-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── exceptions-export.http  # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/
├── controllers/
│   └── export.controller.ts          # ADD: getExceptions() handler
├── services/export/
│   ├── teams.service.ts              # Existing — untouched
│   ├── teams.service.spec.ts         # Existing — untouched
│   ├── exceptions.service.ts         # NEW
│   └── exceptions.service.spec.ts   # NEW
└── app.module.ts                     # ADD: ExceptionsService to providers
```

**Structure Decision**: Single-app pattern. `ExceptionsService` is a plain
`@Injectable()` provider registered directly in `AppModule.providers`, identical to
`TeamsService`. No new Nx lib, no new controller.
