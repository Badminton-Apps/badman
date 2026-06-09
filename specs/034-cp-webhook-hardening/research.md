# Research: CP Webhook Hardening & Email Diagnostics

## Decision 1: Input validation approach

**Decision**: Manual validation inside the controller handler (guard clauses + `BadRequestException`), consistent with the existing `generate` handler pattern.

**Rationale**: No global `ValidationPipe` is configured in `main.ts`. The existing controllers (`cp.controller.ts`, `app.controller.ts`) use plain body types with manual checks. Introducing class-validator DTOs would be inconsistent and out of scope for this targeted hardening.

**Alternatives considered**:

- Class-validator + `@UsePipes(ValidationPipe)`: Correct for a greenfield NestJS app but inconsistent with current style; deferred to a future unified validation pass.

---

## Decision 2: Startup configuration warning

**Decision**: Implement `OnModuleInit` on `CpController`. Log a warning (not an error) if `CP_WEBHOOK_SECRET` is absent or empty.

**Rationale**: `OnModuleInit` is the established pattern in this codebase (see `DatabaseModule`, `CompileService`, `EnrollmentModule`). A warning at boot gives operators immediate visibility without blocking startup.

**Alternatives considered**:

- Throw at startup: Too disruptive — the controller is rarely used. A warning is sufficient.

---

## Decision 3: Error isolation for email dispatch

**Decision**: Wrap each `_sendCompletionEmail` / `_sendFailureEmail` call in an independent try/catch inside the webhook handler. Log error with `run_id`, `user_id`, and error message. Always return `{ ok: true }` when the secret is valid and body is well-formed.

**Rationale**: GitHub Actions retries on 5xx. If email dispatch fails and the webhook returns 500, GitHub retries — potentially sending duplicate emails when the transient failure clears, or triggering a retry storm that never succeeds if the email failure is permanent. Returning 2xx on email failure matches the webhook contract: "we received your notification" vs "we successfully emailed the user".

**Alternatives considered**:

- Return 500 on email failure and let GitHub retry: Causes duplicate emails; the retry loop never helps if the email system is down.
- Fire-and-forget (don't await email): Hides errors entirely; no improvement over current state.

---

## Decision 4: Idempotency guard for duplicate webhook deliveries

**Decision**: Before processing, check if `body.run_id` is already a key in `this.generations` with a non-pending status. If found, log a warning and return `{ ok: true }` immediately.

**Rationale**: GitHub may deliver the same webhook twice on transient HTTP errors. A duplicate delivery should not re-send email or overwrite the already-processed record.

**Implementation note**: The tracking ID key (`${eventId}-${timestamp}`) and the real `run_id` are both stored as keys. A duplicate delivery arrives with the same `run_id`, which is already a key after first processing. Simple `Map.has(body.run_id)` check suffices.

---

## Decision 5: `_cleanupExpiredRecords` invocation

**Decision**: Call at the start of both `generate` and `webhook` handlers (lazy cleanup, no timer).

**Rationale**: The method already exists and is fully implemented. It just needs to be called. Timer-based cleanup is unnecessary for a once-a-year operation. Lazy cleanup on request is consistent with the original design intent (per the existing comment in the code).

---

## Decision 6: Structured logging fields

**Decision**: Add `context` object to log calls in the webhook handler, including `{ runId, userId, status }`. Use existing `this.logger` (NestJS Logger), which feeds into the winston transport already configured.

**Rationale**: The existing logger is already wired to winston via `app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))`. Structured log objects are supported. No new logging infrastructure needed.
