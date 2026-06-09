# Tasks: CP Webhook Hardening & Email Diagnostics

**Input**: Design documents from `specs/034-cp-webhook-hardening/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Tasks follow user story priority order. All implementation changes land in 2 files:

- `apps/api/src/app/controllers/cp.controller.ts` — controller
- `apps/api/src/app/controllers/cp.controller.spec.ts` — tests

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — Controller Lifecycle Hook

**Purpose**: `OnModuleInit` must be in place before anything else; startup warning depends on it.

**⚠️ CRITICAL**: Implement before any user story work. Affects controller class signature.

- [ ] T001 Add `OnModuleInit` to `CpController` class and implement `onModuleInit()` that reads `CP_WEBHOOK_SECRET` and logs `this.logger.warn("CP_WEBHOOK_SECRET is not configured — all webhook calls will be rejected")` when absent or empty in `apps/api/src/app/controllers/cp.controller.ts`

**Checkpoint**: Controller boots with startup warning visible when `CP_WEBHOOK_SECRET` env var is unset.

---

## Phase 2: User Story 1 — Email delivery robustness (Priority: P1) 🎯 MVP

**Goal**: Webhook always returns `{ ok: true }` on valid input regardless of email outcome; expired records cleaned up; email failures produce log entries with full context.

**Independent Test**: Send a valid webhook call with `status: "completed"` where `MailingService.sendCpExportReadyMail` is mocked to throw — confirm `{ ok: true }` is returned and the error is logged.

- [ ] T002 [US1] Call `this._cleanupExpiredRecords()` as the first statement inside `generate()` after the auth and permission checks in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T003 [US1] Call `this._cleanupExpiredRecords()` as the first statement inside `webhook()` after the secret check in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T004 [US1] Wrap the `await this._deleteGist(record.gistId, githubToken)` call inside the webhook record-lookup loop in a `try/catch`; on catch log `this.logger.warn("Gist cleanup failed", { gistId: record.gistId, error: String(e) })` and continue processing in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T005 [US1] Replace the bare `await this._sendCompletionEmail(body.user_id, body.run_id)` with a `try/catch` block; on success log `this.logger.log("Completion email dispatched", { runId: body.run_id, userId: body.user_id })`; on catch log `this.logger.error("Failed to send completion email", { runId: body.run_id, userId: body.user_id, error: String(e) })` in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T006 [US1] Replace the bare `await this._sendFailureEmail(body.user_id)` with a `try/catch` block; on success log `this.logger.log("Failure email dispatched", { runId: body.run_id, userId: body.user_id })`; on catch log `this.logger.error("Failed to send failure email", { runId: body.run_id, userId: body.user_id, error: String(e) })` in `apps/api/src/app/controllers/cp.controller.ts`

**Checkpoint**: All existing `POST /cp/webhook` tests pass. Email throwing does not crash the webhook.

---

## Phase 3: User Story 2 — Input validation & idempotency (Priority: P2)

**Goal**: Webhook returns 400 for malformed bodies; duplicate `run_id` deliveries are short-circuited with `{ ok: true }`.

**Independent Test**: POST `/cp/webhook` with valid secret but `run_id: ""` → expect 400. POST twice with same `run_id` → second call returns `{ ok: true }` immediately.

- [ ] T007 [US2] Add guard clauses immediately after the `expectedSecret` check in `webhook()`: throw `new BadRequestException("run_id, user_id, and status are required")` if any of `body.run_id`, `body.user_id`, or `body.status` is falsy in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T008 [US2] Add status enum guard directly after T007: throw `new BadRequestException(\`Invalid status: \${body.status}. Must be "completed" or "failed"\`)`if`body.status !== "completed" && body.status !== "failed"`in`apps/api/src/app/controllers/cp.controller.ts`
- [ ] T009 [US2] Add idempotency guard after the cleanup call and validation guards: `const existingRecord = this.generations.get(body.run_id); if (existingRecord && existingRecord.status !== "pending") { this.logger.warn("Duplicate webhook delivery", { runId: body.run_id, existingStatus: existingRecord.status }); return { ok: true }; }` in `apps/api/src/app/controllers/cp.controller.ts`

**Checkpoint**: Malformed requests return 400. Sending the same webhook twice does not double-send email.

---

## Phase 4: User Story 3 — Structured logging throughout flow (Priority: P3)

**Goal**: Every webhook invocation leaves a log trail: receipt, record match result, email dispatch attempt and outcome.

**Independent Test**: With `Logger` spied (`jest.spyOn(controller['logger'], 'log')`), send a valid webhook — confirm log calls with `runId` and `userId` in their context argument.

- [ ] T010 [US3] Add `this.logger.log("Webhook received", { runId: body.run_id, userId: body.user_id, status: body.status })` immediately after all validation guards (after T007–T009 logic) in `apps/api/src/app/controllers/cp.controller.ts`
- [ ] T011 [US3] After the pending-record lookup `for` loop, add a conditional log: `if (matchedTrackingId) { this.logger.log("Matched pending record", { runId: body.run_id, trackingId: matchedTrackingId }); } else { this.logger.warn("No pending record found — storing by run_id directly", { runId: body.run_id, userId: body.user_id }); }` in `apps/api/src/app/controllers/cp.controller.ts`

**Checkpoint**: Tailing server logs during a webhook call shows receipt, record match, and email outcome entries with `runId` and `userId`.

---

## Phase 5: Tests

**Purpose**: Cover all new behavior with unit tests; ensure existing tests remain green.

- [ ] T012 [US2] Add test in `describe("POST /cp/webhook")`: `it("should return 400 if run_id is missing")` — call `controller.webhook("test-secret", { run_id: "", user_id: "user-1", status: "completed" })` and expect `BadRequestException` in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T013 [US2] Add test: `it("should return 400 if user_id is missing")` — expect `BadRequestException` when `user_id` is empty string in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T014 [US2] Add test: `it("should return 400 if status is missing")` — expect `BadRequestException` when `status` is empty string in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T015 [US2] Add test: `it("should return 400 for invalid status value")` — call with `status: "success"` and expect `BadRequestException` in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T016 [US1] Add test: `it("should return { ok: true } even when email dispatch throws")` — mock `MailingService.sendCpExportReadyMail` to `jest.fn().mockRejectedValue(new Error("SMTP error"))`; set up a pending record via `generate()`; send webhook with valid secret and `status: "completed"`; expect result to equal `{ ok: true }` in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T017 [US2] Add test: `it("should return { ok: true } for duplicate run_id without re-sending email")` — process a webhook once (status completed); spy on `MailingService`; send same `run_id` again; confirm mail spy called only once total and result is `{ ok: true }` in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T018 [US1] Add test: `it("should return { ok: true } when Player.findByPk returns null")` — mock `Player.findByPk` to return `null`; set up pending record; send webhook; expect `{ ok: true }` and no exception in `apps/api/src/app/controllers/cp.controller.spec.ts`
- [ ] T019 Run full controller test suite and confirm all tests pass: `npx jest --config apps/api/jest.config.ts apps/api/src/app/controllers/cp.controller.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 — `OnModuleInit` must be in place
- **Phase 3 (US2)**: Can start after Phase 1; independent of Phase 2 (different code paths in the method)
- **Phase 4 (US3)**: Depends on Phase 2 and Phase 3 — log entries reference the guards and cleanup calls added there
- **Phase 5 (Tests)**: Can be written from Phase 3 onward; T016/T018 depend on Phase 2; T012–T015/T017 depend on Phase 3

### User Story Dependencies

- **US1 (P1)**: After Phase 1 — no dependency on US2 or US3
- **US2 (P2)**: After Phase 1 — no dependency on US1 or US3
- **US3 (P3)**: After US1 and US2 — log entries for email and record-match reference both

### Within Each Phase

- T002, T003 can be done together (both add the same 1-line call, different methods)
- T004, T005, T006 are sequential edits to the same webhook method body
- T007, T008 must be sequential (T008 comes right after T007 in the method)
- T009 comes after T007 + T008
- T012–T018 are sequential additions to the same spec file

---

## Parallel Opportunities

```bash
# Phase 2 + Phase 3 can run in parallel (different code paths):
Task Agent A: "Implement US1 email try/catch and cleanup (T002–T006)"
Task Agent B: "Implement US2 body validation and idempotency (T007–T009)"

# Tests can be written in parallel with Phase 4 (US3 logging):
Task Agent A: "Add US3 structured log entries (T010–T011)"
Task Agent B: "Write test cases T012–T015 for validation"
Task Agent C: "Write test cases T016–T018 for email error isolation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) — OnModuleInit
2. Complete Phase 2 (T002–T006) — email error isolation + cleanup
3. Add T016 + T018 from Phase 5 tests
4. Run T019 — verify tests pass
5. **STOP and VALIDATE**: webhook no longer returns 500 on email failure

### Incremental Delivery

1. Phase 1 + Phase 2 → Fix silent email failures (MVP)
2. Phase 3 → Harden input validation + idempotency
3. Phase 4 → Add full structured logging
4. Phase 5 → Complete test coverage
5. Each phase adds value and is independently verifiable

---

## Notes

- All changes are in 2 files — no migrations, no new dependencies, no new files
- `_deleteGist` already logs unexpected HTTP status codes; T004 adds `try/catch` around the `fetch` call itself (network errors)
- Existing tests must pass throughout — do not remove or modify existing test cases
- `_cleanupExpiredRecords` already exists and is fully implemented; tasks T002/T003 just call it
- `BadRequestException` is already imported in `cp.controller.ts`; no new imports needed for T007/T008
- `OnModuleInit` needs to be imported from `@nestjs/common` (add to existing import list in T001)
