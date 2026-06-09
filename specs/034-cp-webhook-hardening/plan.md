# Implementation Plan: CP Webhook Hardening & Email Diagnostics

**Branch**: `034-cp-webhook-hardening` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/034-cp-webhook-hardening/spec.md`

## Summary

Harden `POST /cp/webhook` in `CpController` to fix silent email delivery failures. Changes: wrap email dispatch in try/catch so webhook always returns 2xx on valid input, add body validation (400 on missing/invalid fields), add idempotency guard for duplicate `run_id` deliveries, add `OnModuleInit` startup warning for missing `CP_WEBHOOK_SECRET`, call `_cleanupExpiredRecords` on every request, and add structured log entries throughout the flow. Update `cp.controller.spec.ts` with matching test cases.

## Technical Context

**Language/Version**: TypeScript, Node.js 20  
**Primary Dependencies**: NestJS (Fastify adapter), `@badman/backend-mailing`, `@badman/backend-database` (Player model), ConfigService  
**Storage**: In-memory `Map<string, CpGenerationRecord>` — no DB changes  
**Testing**: Jest via `npx jest --config apps/api/jest.config.ts` (or `nx test api`)  
**Target Platform**: NestJS API server, `apps/api/`  
**Project Type**: web-service  
**Performance Goals**: Webhook response < 500ms; no new I/O paths added  
**Constraints**: No DB migration, no new dependencies, no change to mailing service internals  
**Scale/Scope**: Once-a-year operation, < 10 concurrent users

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Applies?                                                                                                                          | Status                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| I. Code-First GraphQL        | No — REST controller, no new entities                                                                                             | ✅ PASS                                        |
| II. Translation Discipline   | No — no user-facing strings in scope                                                                                              | ✅ PASS                                        |
| III. Transactional Mutations | No — REST controller, not a GraphQL mutation                                                                                      | ✅ PASS                                        |
| IV. Resolver Test Discipline | Partial — controller spec must be updated with new test cases, following `jest.spyOn` + `afterEach(jest.restoreAllMocks)` pattern | ✅ PASS (spec already exists; new cases added) |
| V. Legacy Frontend Boundary  | No — backend only                                                                                                                 | ✅ PASS                                        |

**Post-design re-check**: No new entities, no i18n changes, no GraphQL mutations. Constitution fully satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/034-cp-webhook-hardening/
├── plan.md           ← this file
├── spec.md
├── research.md
├── data-model.md
└── checklists/
    └── requirements.md
```

### Source Code (files modified)

```text
apps/api/src/app/controllers/
├── cp.controller.ts       ← main changes
└── cp.controller.spec.ts  ← new test cases
```

No new files. No migrations.

## Implementation Design

### Changes to `cp.controller.ts`

#### 1. Implement `OnModuleInit` for startup warning

```typescript
import { OnModuleInit } from "@nestjs/common";

export class CpController implements OnModuleInit {
  onModuleInit() {
    const secret = this.configService.get("CP_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn("CP_WEBHOOK_SECRET is not configured — all webhook calls will be rejected");
    }
  }
}
```

#### 2. Add body validation to `webhook()`

At the top of the handler, before any processing:

```typescript
if (!body.run_id || !body.user_id || !body.status) {
  throw new BadRequestException("run_id, user_id, and status are required");
}
if (body.status !== "completed" && body.status !== "failed") {
  throw new BadRequestException(`Invalid status: ${body.status}. Must be "completed" or "failed"`);
}
```

#### 3. Add idempotency guard

After validation, before record lookup:

```typescript
const existing = this.generations.get(body.run_id);
if (existing && existing.status !== "pending") {
  this.logger.warn(
    `Duplicate webhook delivery for run_id=${body.run_id}, status=${existing.status} — ignoring`
  );
  return { ok: true };
}
```

#### 4. Wrap email dispatch in try/catch

Replace the bare awaits with isolated try/catch blocks:

```typescript
if (body.status === "completed") {
  try {
    await this._sendCompletionEmail(body.user_id, body.run_id);
    this.logger.log(`Completion email dispatched`, { runId: body.run_id, userId: body.user_id });
  } catch (e) {
    this.logger.error(`Failed to send completion email`, {
      runId: body.run_id,
      userId: body.user_id,
      error: String(e),
    });
  }
} else {
  try {
    await this._sendFailureEmail(body.user_id);
    this.logger.log(`Failure email dispatched`, { runId: body.run_id, userId: body.user_id });
  } catch (e) {
    this.logger.error(`Failed to send failure email`, {
      runId: body.run_id,
      userId: body.user_id,
      error: String(e),
    });
  }
}
```

#### 5. Add structured log entries at receipt and record-match

```typescript
this.logger.log(`Webhook received`, {
  runId: body.run_id,
  userId: body.user_id,
  status: body.status,
});
// ... after record lookup:
if (matchedTrackingId) {
  this.logger.log(`Matched pending record`, { runId: body.run_id, trackingId: matchedTrackingId });
} else {
  this.logger.warn(`No pending record found — storing by run_id directly`, {
    runId: body.run_id,
    userId: body.user_id,
  });
}
```

#### 6. Call `_cleanupExpiredRecords` at start of `generate` and `webhook`

Add as first line of each handler body, after auth/validation:

```typescript
this._cleanupExpiredRecords();
```

### Changes to `cp.controller.spec.ts`

New test cases to add under `describe("POST /cp/webhook")`:

| Test                                   | Expected outcome                        |
| -------------------------------------- | --------------------------------------- |
| Missing `run_id`                       | Throws `BadRequestException`            |
| Missing `user_id`                      | Throws `BadRequestException`            |
| Missing `status`                       | Throws `BadRequestException`            |
| Invalid `status` value (`"success"`)   | Throws `BadRequestException`            |
| Email dispatch throws                  | Webhook still returns `{ ok: true }`    |
| Duplicate `run_id` (already processed) | Returns `{ ok: true }`, no second email |
| `Player.findByPk` returns null         | Returns `{ ok: true }`, warning logged  |

Existing tests must continue to pass unchanged.

## Complexity Tracking

No constitution violations. No complexity tracking needed.
