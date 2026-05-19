# Research: Teams Export — Backend Endpoint

**Feature**: [spec.md](spec.md)
**Date**: 2026-05-06
**Status**: Complete — all decisions resolved by spec 008 precedent or clarification session

---

## Decision Log

### 1. Auth pattern

**Decision**: Same two-step inline check as spec 008 (`EnrollmentController`):
- `UnauthorizedException` (401) when `user?.id` is falsy
- `ForbiddenException` (403) when `user.hasAnyPermission(["edit:competition"])` returns false

**Rationale**: Established in spec 008. Using a `CanActivate` guard collapses 401 and 403
into a single 401, violating FR-001 and FR-002 as distinct requirements.

**Alternatives considered**: NestJS `CanActivate` guard — rejected; always produces 401.

---

### 2. Validation pattern

**Decision**: Same manual inline validation as spec 008:
- `BadRequestException` (400) for missing or non-UUID `eventId` via `IsUUID()` from `@badman/utils`
- `BadRequestException` (400) for `format` values other than `xlsx` or `csv`
- `NotFoundException` (404) when `EventCompetition.findByPk()` returns null

**Rationale**: Established in spec 008. Avoids `ValidationPipe` overhead for two
query params on a REST endpoint. Consistent with all other REST controllers.

---

### 3. Format switching

**Decision**: `format` query param (`xlsx` | `csv`, default `xlsx`). The controller
validates `format`, calls the service to get `{ headers, rows }`, then calls
`toXlsx` or `toCSV` from `@badman/backend-utils` and sets the correct
`Content-Type` and `Content-Disposition` headers.

**Rationale**: Services assemble data — they must not own serialization. The controller
owns the HTTP response shape. This means adding a third format in future requires
no service changes.

**Alternatives considered**: Service returns both formats — rejected; wasteful and
couples the service to the HTTP layer.

---

### 4. Module placement

**Decision**: `ExportController` and its services live directly in the API app
(`apps/api/src/app/controllers/export.controller.ts`,
`apps/api/src/app/services/export/`). Registered in `AppModule.controllers` —
same pattern as `CpController`. No new Nx lib created.

**Rationale**: No other app needs export functionality — it is purely API-serving.
A new Nx lib adds project scaffolding overhead (project.json, tsconfig files,
package.json, generator) with zero benefit. `CpController` proves the pattern
works for standalone REST controllers in this repo.

**Alternatives considered**: New `@badman/backend-export` Nx lib — rejected;
unnecessary overhead when no cross-app sharing is needed.

---

### 5. Deduplication

**Decision**: `Set<string>` of team IDs maintained during traversal. Skip any
team whose `id` is already in the set.

**Rationale**: O(1) per lookup, no extra DB queries. Matches old Angular client
behaviour (FR-008). The service returns one deduplicated row set; the controller
serialises it into the requested format.

---

### 6. Day name translation

**Decision**: Translate `preferredDay` ENUM values to Dutch day names server-side:
`monday` → `Maandag`, `tuesday` → `Dinsdag`, `wednesday` → `Woensdag`,
`thursday` → `Donderdag`, `friday` → `Vrijdag`, `saturday` → `Zaterdag`,
`sunday` → `Zondag`. Missing value → empty string.

**Rationale**: The old Angular teams export emitted raw ENUM strings — a known
inconsistency vs. the locations export which did translate. This spec fixes it
so the output is human-readable for competition administrators.

---

### 7. Time formatting

**Decision**: Format `preferredTime` as `HH:mm` (strip seconds from the `HH:mm:ss`
string Sequelize returns for `DataType.TIME` columns). Missing value → empty string.

**Rationale**: Raw `"09:00:00"` is less readable than `"09:00"`. The old Angular
code emitted raw time strings — same known inconsistency, fixed here.
