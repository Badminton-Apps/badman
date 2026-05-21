# Tasks: CP Export Controller Hardening

**Input**: Design documents from `specs/013-cp-export-hardening/`
**Branch**: `013-cp-export-hardening`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: User Story 1 — Fix Failing Tests (Priority: P1)

**Goal**: All 17 existing CP controller tests pass by adding `MailingService` as a mock provider in the test module.

**Independent Test**: `npx jest --testPathPattern=cp.controller.spec` — all 17 tests pass.

- [X] T001 [US1] Add `MailingService` import from `@badman/backend-mailing` and mock provider `{ provide: MailingService, useValue: { sendCpExportReadyMail: jest.fn(), sendCpExportFailedMail: jest.fn() } }` to the `providers` array in `beforeEach` in `apps/api/src/app/controllers/cp.controller.spec.ts`

**Checkpoint**: `npx jest --testPathPattern=cp.controller.spec` — all 17 tests pass.

---

## Phase 2: User Story 2 — Correct HTTP Status Codes (Priority: P1)

**Goal**: Permission denial returns HTTP 403 (`ForbiddenException`) instead of HTTP 401 on both secured endpoints.

**Independent Test**: Authenticated request without `export-cp:competition` → HTTP 403 on both `POST /cp/generate` and `GET /cp/download/:runId`.

- [X] T002 [US2] In `apps/api/src/app/controllers/cp.controller.ts`: add `ForbiddenException` to the `@nestjs/common` import, replace `throw new UnauthorizedException("You do not have permission to export CP files")` in `generate()` with `throw new ForbiddenException("Insufficient permissions")`, and replace `throw new UnauthorizedException("You do not have permission to download CP files")` in `download()` with `throw new ForbiddenException("Insufficient permissions")`
- [X] T003 [US2] In `apps/api/src/app/controllers/cp.controller.spec.ts`: add `ForbiddenException` to the import from `@nestjs/common`, update the two `rejects.toThrow(UnauthorizedException)` assertions for permission denial (one in `POST /cp/generate` describe block, one in `GET /cp/download/:runId` describe block) to `rejects.toThrow(ForbiddenException)`

**Checkpoint**: `npx jest --testPathPattern=cp.controller.spec` — permission denial tests assert 403 and pass.

---

## Phase 3: User Story 3 — Input Validation (Priority: P1)

**Goal**: Invalid or missing `eventId` rejected with HTTP 400 (`BadRequestException`) before any service call; raw `HttpException(..., 400)` replaced with `BadRequestException`.

**Independent Test**: `POST /cp/generate` with missing or non-UUID `eventId` → HTTP 400 before `CpDataCollector.collect` is called.

- [X] T004 [US3] In `apps/api/src/app/controllers/cp.controller.ts`: add `import { IsUUID } from '@badman/utils'`, replace `throw new HttpException('eventId is required', 400)` with `throw new BadRequestException('eventId is required')`, and add `if (!IsUUID(eventId)) throw new BadRequestException('eventId must be a valid UUID')` immediately after the existing `!eventId` check; also add `BadRequestException` to the `@nestjs/common` imports and remove `HttpException` if no longer used

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T005 [P] Run `npx jest --config apps/api/jest.config.ts` and confirm all CP controller tests pass and no new failures are introduced
- [X] T006 [P] Run `npx prettier --check apps/api/src/app/controllers/cp.controller.ts apps/api/src/app/controllers/cp.controller.spec.ts` and fix any formatting issues

---

## Dependencies & Execution Order

- Phase 1 (US1) unblocks Phase 2 and 3 — once tests run, the other fixes can be validated
- Phase 2 (US2) and Phase 3 (US3) can be done in either order or in parallel (different changes in the same files, but T003 depends on T002)
- Phase 4 depends on Phases 1–3

```
T001 → T002 → T003
T001 → T004
(T002, T003, T004) → T005 ‖ T006
```

---

## Implementation Strategy

All three user stories are P1 — deliver together as a single unit.

1. T001: Fix test module setup → tests now run
2. T002–T003: Fix status codes in controller + update test assertions → 403 tests pass
3. T004: Add UUID validation → 400 tests pass
4. T005–T006: Full suite + prettier

**STOP and VALIDATE**: Run the full API test suite before merging.

---

## Notes

- `IsUUID` is already imported and used in `export.controller.ts` — same utility, same pattern
- `ForbiddenException` is already imported in `export.controller.ts` — import from `@nestjs/common`
- `HttpException` import can be removed from `cp.controller.ts` if `T004` removes the last usage (check for other usages first — there are 413, 502, 503 throws that use `HttpException` directly and should remain)
- The in-memory `Map` for generation records is intentional — do not change
