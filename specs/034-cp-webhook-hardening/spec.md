# Feature Specification: CP Webhook Hardening & Email Diagnostics

**Feature Branch**: `034-cp-webhook-hardening`  
**Created**: 2026-06-09  
**Status**: Draft  
**Input**: Improve and harden `/cp/webhook`; fix silent email delivery failures with no visible errors

## Context

The CP export flow triggers a GitHub Actions workflow, which calls back `/cp/webhook` when done. The webhook is supposed to send a notification email to the requesting user. Emails are not being received and no errors are surfacing. Code review reveals several silent failure paths and missing validation.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Webhook completes and email is delivered (Priority: P1)

A competition admin triggers CP generation. GitHub Actions completes the workflow and calls the webhook. The admin receives an email with a download link.

**Why this priority**: Core success path. Currently broken — emails are not received and there is no error trace.

**Independent Test**: Trigger a generation, send a webhook call with `status: "completed"`, verify email is sent (or logged as attempted with reason if skipped).

**Acceptance Scenarios**:

1. **Given** a valid webhook secret and a completed generation record, **When** the webhook receives `status: "completed"`, **Then** a completion email is dispatched and the webhook returns `{ ok: true }`.
2. **Given** a valid webhook secret and `status: "failed"`, **When** the webhook is called, **Then** a failure email is dispatched and the webhook returns `{ ok: true }`.
3. **Given** email dispatch throws an internal error, **When** the webhook processes it, **Then** the error is logged with full context (user ID, run ID, error message) and the webhook still returns `{ ok: true }` — the caller never receives a 5xx.
4. **Given** the user record cannot be found in the database, **When** the webhook tries to send an email, **Then** a warning is logged with user ID and the webhook returns `{ ok: true }`.

---

### User Story 2 - Webhook rejects invalid or malformed requests (Priority: P2)

The webhook endpoint is public (no auth guard). It must reject unauthorized callers and invalid payloads before doing any work.

**Why this priority**: Security hardening. Without this, anyone who discovers the URL can inject fake completion events.

**Independent Test**: Send requests with wrong secret, missing secret, missing required fields — each must be rejected with an appropriate 4xx, no side effects.

**Acceptance Scenarios**:

1. **Given** a request with a missing or incorrect `x-webhook-secret` header, **When** the webhook is called, **Then** it returns 401 and no record is modified.
2. **Given** `CP_WEBHOOK_SECRET` is not configured in the environment, **When** the server starts, **Then** a startup warning is logged so operators know the endpoint is misconfigured.
3. **Given** a request body missing `run_id`, `user_id`, or `status`, **When** the webhook is called, **Then** it returns 400 with a clear error indicating which field is missing.
4. **Given** `status` is a value other than `"completed"` or `"failed"`, **When** the webhook is called, **Then** it returns 400.

---

### User Story 3 - Webhook flow is fully traceable in logs (Priority: P3)

An operator or developer can follow the entire webhook execution path in logs: receipt, record lookup result, gist cleanup result, email dispatch attempt, and outcome.

**Why this priority**: Without this, diagnosing "emails don't seem to get sent" requires adding logging under pressure. Having it from the start prevents the next silent failure.

**Independent Test**: Tail server logs while sending a webhook call; confirm a structured trace covering receipt → record match → email attempt → outcome.

**Acceptance Scenarios**:

1. **Given** a webhook call arrives, **When** it is processed, **Then** logs include: run ID, user ID, status, whether a pending record was matched, and whether email dispatch was attempted.
2. **Given** email dispatch is skipped (e.g., user has no email, mailing not configured), **When** the webhook processes, **Then** a warning log explains why, with enough context to diagnose in production.
3. **Given** gist cleanup fails, **When** the webhook processes, **Then** the failure is logged as a warning (not an error) and processing continues normally.

---

### Edge Cases

- What happens when the webhook is called for a `user_id` with no matching pending record (e.g., API restarted between generate and webhook)? → Record created from webhook data; email attempted using the provided `user_id`.
- What if `Player.findByPk` returns null (user deleted)? → Warn and skip email; webhook returns `{ ok: true }`.
- What if email sending fails (SMTP error, missing config)? → Log error with context; webhook returns `{ ok: true }`.
- What if the same `run_id` arrives twice (GitHub retry after a transient failure)? → Second call should be idempotent — log a warning and return `{ ok: true }` without re-sending email.
- What if `CP_WEBHOOK_SECRET` is configured but empty string? → Treat as misconfigured; reject all requests.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The webhook MUST wrap all email dispatch calls in a try/catch so that email failures never cause the endpoint to return a 5xx response.
- **FR-002**: The webhook MUST validate that `run_id`, `user_id`, and `status` are present non-empty strings; return 400 if any are missing.
- **FR-003**: The webhook MUST validate that `status` is one of `"completed"` or `"failed"`; return 400 for other values.
- **FR-004**: At startup, the controller MUST log a warning if `CP_WEBHOOK_SECRET` is not configured or is an empty string.
- **FR-005**: Each webhook invocation MUST produce structured log entries covering: arrival, record match result, email dispatch attempt, and final outcome.
- **FR-006**: The webhook MUST be idempotent for duplicate `run_id` deliveries: detect an already-processed record and return `{ ok: true }` without re-sending email.
- **FR-007**: Gist cleanup failures MUST be logged as warnings and MUST NOT abort normal webhook processing.
- **FR-008**: The `_cleanupExpiredRecords` method MUST be called at the start of each `generate` and `webhook` request to prevent unbounded in-memory growth.

### Key Entities

- **CpGenerationRecord**: In-memory record tracking a generation run. Fields: `runId`, `userId`, `eventId`, `locale`, `status`, `createdAt`, `gistId`. Status transitions: `pending` → `completed` | `failed`.
- **WebhookBody**: Validated input shape for the webhook. Required: `run_id` (non-empty string), `user_id` (non-empty string), `status` (`"completed"` | `"failed"`). Optional: `download_url` (reserved for future use).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A webhook call that previously failed silently now either sends an email or emits a log entry explaining exactly why it did not, in 100% of cases.
- **SC-002**: A malformed webhook request (missing fields, wrong secret) returns a 4xx response within 200ms with no state changes.
- **SC-003**: Webhook endpoint returns `{ ok: true }` (2xx) in all scenarios where the secret is valid and the body is well-formed, even if email dispatch fails — eliminating spurious GitHub retry storms.
- **SC-004**: Duplicate webhook deliveries (same `run_id`) are handled gracefully: no duplicate emails, no errors, `{ ok: true }` returned.
- **SC-005**: All webhook log entries include `run_id` and `user_id` as structured fields, enabling log search/filter by those identifiers.

## Assumptions

- `MAIL_ENABLED`, `DEV_EMAIL_DESTINATION`, and SMTP config are owned by the mailing service; this feature adds logging around the call but does not change mailing service internals.
- The in-memory store is intentional for this once-a-year operation; this feature does not replace it with a persistent store.
- GitHub Actions retries a webhook on 5xx but not on 2xx, so returning `{ ok: true }` even on email failure is the correct contract.
- The duplicate-delivery guard uses `run_id` as the idempotency key; the same `run_id` arriving twice means the first delivery already set status to `completed` or `failed`.
- Startup warning for missing `CP_WEBHOOK_SECRET` is sufficient; the endpoint does not need to be disabled at startup (it will reject all calls anyway).
