# Feature Specification: CP Export Controller Hardening

**Feature Branch**: `013-cp-export-hardening`
**Created**: 2026-05-08
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Passing Test Suite (Priority: P1)

The CP export controller has a complete test file that currently fails because `MailingService` is not provided in the test module. After this work, all 17 tests pass without modification to the test logic.

**Why this priority**: Failing tests block CI and hide regressions. All other hardening work in this spec can only be validated once the suite runs.

**Independent Test**: Run `npx jest --testPathPattern=cp.controller.spec` — all tests pass.

**Acceptance Scenarios**:

1. **Given** the test suite is run, **When** `MailingService` is provided as a mock in the test module, **Then** all 17 tests pass.
2. **Given** a webhook call triggers `_sendCompletionEmail`, **When** the mocked `MailingService` is invoked, **Then** `sendCpExportReadyMail` is called with the correct player and download URL.
3. **Given** a webhook call triggers `_sendFailureEmail`, **When** the mocked `MailingService` is invoked, **Then** `sendCpExportFailedMail` is called with the correct player details.

---

### User Story 2 — Correct HTTP Status Codes (Priority: P1)

The `POST /cp/generate` and `GET /cp/download/:runId` endpoints currently throw `UnauthorizedException` (HTTP 401) when the caller is authenticated but lacks the `export-cp:competition` permission. The correct status for an authenticated but unauthorised caller is HTTP 403. After this work, permission denial returns 403, and missing authentication returns 401.

**Why this priority**: Incorrect status codes mislead API consumers and frontends — a 401 signals "please log in again" while a 403 signals "you don't have access".

**Independent Test**: Authenticated request without `export-cp:competition` → HTTP 403. Unauthenticated request → HTTP 401.

**Acceptance Scenarios**:

1. **Given** a request to `POST /cp/generate` with no user, **When** processed, **Then** HTTP 401 is returned.
2. **Given** a request to `POST /cp/generate` from an authenticated user without `export-cp:competition`, **When** processed, **Then** HTTP 403 is returned.
3. **Given** a request to `GET /cp/download/:runId` with no user, **When** processed, **Then** HTTP 401 is returned.
4. **Given** a request to `GET /cp/download/:runId` from an authenticated user without `export-cp:competition`, **When** processed, **Then** HTTP 403 is returned.

---

### User Story 3 — Input Validation (Priority: P1)

The `POST /cp/generate` endpoint accepts any string as `eventId` without validating it is a UUID, and uses raw `HttpException` with a hardcoded 400 status rather than the framework's `BadRequestException`. After this work, a non-UUID `eventId` is rejected with HTTP 400 before any database or GitHub API work begins, consistent with all other export endpoints.

**Why this priority**: Matches the validation pattern already established in the teams/exceptions/locations/enrollment export endpoints. Prevents garbage data from reaching the GitHub workflow dispatch.

**Independent Test**: `POST /cp/generate` with `eventId: "not-a-uuid"` → HTTP 400. Missing `eventId` → HTTP 400.

**Acceptance Scenarios**:

1. **Given** a request with a missing `eventId`, **When** processed, **Then** HTTP 400 is returned before any service is called.
2. **Given** a request with a non-UUID `eventId` (e.g. `"abc"`), **When** processed, **Then** HTTP 400 is returned.
3. **Given** a request with a valid UUID `eventId`, **When** processed, **Then** the request proceeds to data collection.

---

### Edge Cases

- Webhook arrives for a `userId` with no matching pending record (e.g. record expired) → webhook still returns `{ ok: true }` without crashing.
- `Player.findByPk` returns null when sending email (player deleted) → warning is logged, no crash.
- GitHub workflow dispatch returns non-204 → HTTP 502 returned to the caller.
- Payload exceeds 65535 chars base64 → HTTP 413 returned.
- `GITHUB_TOKEN_CP` or `CP_CALLBACK_URL` not configured → HTTP 503.

---

## Requirements *(mandatory)*

### Functional Requirements

1. The test module in `cp.controller.spec.ts` must include a `MailingService` mock provider so all existing tests pass.
2. Permission denial on `POST /cp/generate` must throw `ForbiddenException` (HTTP 403), not `UnauthorizedException`.
3. Permission denial on `GET /cp/download/:runId` must throw `ForbiddenException` (HTTP 403), not `UnauthorizedException`.
4. `POST /cp/generate` must validate `eventId` using `IsUUID` and throw `BadRequestException` if invalid or missing, before any other processing.
5. All raw `HttpException(msg, 400)` calls must be replaced with `BadRequestException`.
6. Test assertions that currently expect `UnauthorizedException` for permission denial must be updated to expect `ForbiddenException`.

### Non-Functional Requirements

- No change to the observable API contract for paths other than permission denial and input validation.
- No new dependencies introduced.

---

## Success Criteria

- 100% of existing CP controller tests pass (`npx jest --testPathPattern=cp.controller.spec`).
- Authenticated requests without `export-cp:competition` receive HTTP 403 on both secured endpoints.
- Invalid or missing `eventId` receives HTTP 400 before any GitHub API call is made.
- Full API test suite shows no new failures beyond pre-existing ones.

---

## Assumptions

- `MailingService` already implements `sendCpExportReadyMail` and `sendCpExportFailedMail` — no changes needed to the mailing lib.
- `IsUUID` is already available from `@badman/utils`.
- Test assertions for permission denial currently expect `UnauthorizedException` and will need updating alongside the controller fix.

---

## Out of Scope

- Changes to the GitHub Actions workflow (`generate-cp.yml`).
- Persisting generation records to a database (in-memory Map is intentional).
- Frontend integration or UI changes.
- Adding new endpoints or changing the async email-driven download flow.
