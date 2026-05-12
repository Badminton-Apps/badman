# Research: Export Foundation — Security Hardening & Shared Export Utility

## Decision 1: Auth pattern for REST controllers

**Decision**: Use inline `@User() user: Player` + manual `UnauthorizedException` /
`ForbiddenException` checks in the controller handler — NOT `canExecute()`.

**Rationale**: The existing `canExecute()` utility throws `UnauthorizedException`
(HTTP 401) for both unauthenticated and unauthorized cases. The spec requires
HTTP 401 for no auth and HTTP 403 for authenticated-but-no-permission. To respect
HTTP semantics without modifying the shared utility (which would affect all
existing resolvers), the controller performs a two-step check:

```
if (!user?.id) → throw UnauthorizedException  (401)
if (!(await user.hasAnyPermission([...]))) → throw ForbiddenException  (403)
```

This pattern already exists in `AppController.getQueueJob`.

**Alternatives considered**:
- Modify `canExecute()` to use `ForbiddenException` — rejected: changes behaviour
  for all existing GraphQL resolvers.
- Use `canExecute()` as-is — rejected: always returns 401; spec requires 403 for
  the permission-denied case.

---

## Decision 2: Where to place the shared export utility

**Decision**: Add to the existing `@badman/backend-utils` library
(`libs/backend/utils/src/export.util.ts`), not a new Nx project.

**Rationale**: `libs/backend/utils` is the general-purpose backend utility library.
Adding the export helper there keeps the Nx project count flat and is consistent
with the "minimum needed complexity" principle. A dedicated new project for one
or two utility functions would be over-engineering.

`xlsx` must be added to `libs/backend/utils/package.json`. The enrollment lib
already declares `"xlsx": "*"` — the version will match the root lockfile.

**Alternatives considered**:
- New `libs/backend/xlsx/` Nx project — rejected: adds project, tsconfig, and
  package.json overhead for two utility functions.
- Keep XLSX code in enrollment lib — rejected: creates inverted dependency
  (future export libs depending on enrollment).

---

## Decision 3: Shared utility supports both XLSX and CSV

**Decision**: The shared utility (`export.util.ts`) will expose functions for
both formats from the start:

```typescript
// XLSX
createWorkbook(): XLSX.WorkBook
addSheet(wb: XLSX.WorkBook, sheetName: string, headers: string[], rows: Row[]): void
toBuffer(wb: XLSX.WorkBook): Buffer

// CSV
toCSV(headers: string[], rows: Row[]): string
toCSVBuffer(headers: string[], rows: Row[]): Buffer

// Shared type
type Row = (string | number | undefined | null)[]
```

**Rationale**: The average level page (spec for Report 1) needs CSV download, and
other reports may offer CSV as an alternative format in the future. Building both
in the same utility now avoids duplication later and means the formatting logic is
tested once.

CSV implementation: RFC 4180-compliant (comma separator, CRLF line endings,
double-quote escaping for values that contain commas, quotes, or newlines).

**Alternatives considered**:
- XLSX-only now, add CSV later — rejected: the utility API will change shape when
  CSV is added, requiring refactors in consumers. Doing it upfront costs ~15 extra
  lines and zero additional dependencies.

---

## Decision 4: Input validation approach

**Decision**: Validate `eventId` in the controller handler before calling the
service. UUID format check via regex; existence check via
`EventCompetition.findByPk(eventId)` → `NotFoundException` (404) if null.

**Rationale**: Consistent with existing resolver pattern (findByPk → NotFoundException).
No `ValidationPipe` / `class-validator` used on REST controllers in this codebase;
manual checks in the handler match the established pattern.

**Alternatives considered**:
- NestJS `ParseUUIDPipe` — would work but requires pipe registration; manual check
  is consistent with existing REST controllers (`AppController`, `EnrollmentController`).

---

## Decision 5: Auto-size column implementation

**Decision**: The shared utility will use the Angular-service style auto-size
(iterate all rows per column), not the enrollment-service style (find widest row
first). Both produce correct output; the Angular style is simpler and uniform.

**Rationale**: The enrollment service currently uses a slightly different
calculation but produces visually equivalent output. Standardising on the simpler
approach eliminates a subtle divergence without changing the visible result.

---

## File inventory (confirmed from codebase)

| File | Action |
|------|--------|
| `libs/backend/competition/enrollment/src/controllers/excel.controller.ts` | Add auth + validation |
| `libs/backend/competition/enrollment/src/services/excel.services.ts` | Refactor to use shared utility |
| `libs/backend/utils/src/export.util.ts` | **New** — shared XLSX + CSV utility |
| `libs/backend/utils/src/index.ts` | Export new utility |
| `libs/backend/utils/package.json` | Add `xlsx` dependency |
