# Feature Specification: Multi-Provider Mail Transport

**Feature Branch**: `035-multi-provider-mail`  
**Created**: 2026-06-09  
**Status**: Draft  
**Input**: Migrate mailing from single SMTP (nodemailer) transport to a swappable provider abstraction supporting SMTP and Resend, configurable via environment variable.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Switch to Resend without code changes (Priority: P1)

An operator configures `MAIL_PROVIDER=resend` and `RESEND_API_KEY=...` in environment variables. On next deploy, all outgoing emails route through Resend instead of SMTP — no code change, no downtime.

**Why this priority**: Core goal of the feature. Enables the Resend migration without a hard cut-over and without touching any business logic.

**Independent Test**: Set `MAIL_PROVIDER=resend` and a valid API key, trigger `sendTestMail()`, confirm email arrives via Resend dashboard.

**Acceptance Scenarios**:

1. **Given** `MAIL_ENABLED=true`, `MAIL_PROVIDER=resend`, and a valid `RESEND_API_KEY`, **When** any send method is called, **Then** the email is delivered via Resend and does not use SMTP at all.
2. **Given** `MAIL_PROVIDER=resend` and an invalid or missing `RESEND_API_KEY`, **When** a send is attempted, **Then** the error is logged and the application continues without crashing.

---

### User Story 2 - Keep SMTP working unchanged (Priority: P1)

An operator running `MAIL_PROVIDER=smtp` (or no `MAIL_PROVIDER` set at all) sees zero change in behavior: emails still route through nodemailer with `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`.

**Why this priority**: No regressions. Existing deployments must be unaffected before any migration.

**Independent Test**: Leave `MAIL_PROVIDER` unset, trigger any send method, confirm delivery via SMTP as before.

**Acceptance Scenarios**:

1. **Given** `MAIL_ENABLED=true` and `MAIL_PROVIDER` absent or set to `smtp`, **When** any send method is called, **Then** the email is delivered via nodemailer SMTP.
2. **Given** SMTP credentials are invalid, **When** a send is attempted, **Then** the error is logged and the application continues (same behaviour as today).

---

### User Story 3 - Mailing disabled path still works (Priority: P2)

When `MAIL_ENABLED=false`, compiled email HTML is saved to file in development mode and no transport is invoked — regardless of which provider is configured.

**Why this priority**: Preserves existing local-dev workflow used to inspect email output without a live mail server.

**Independent Test**: Set `MAIL_ENABLED=false` and `NODE_ENV=development`, trigger `sendTestMail()`, confirm `mails/test.html` is written and no network call is made.

**Acceptance Scenarios**:

1. **Given** `MAIL_ENABLED=false` and `NODE_ENV=development`, **When** any send method is called, **Then** the rendered HTML is saved to `mails/<template>.html` and no transport sends a network request.
2. **Given** `MAIL_ENABLED=false` and `NODE_ENV=production`, **When** any send method is called, **Then** the method returns silently without sending or writing a file.

---

### User Story 4 - Add a third provider in future with minimal friction (Priority: P3)

A future developer adds a third mail provider (e.g. Mailgun) by creating one new file implementing the transport interface, registering it in the module factory — with zero changes to `MailingService` or any of its 16 public methods.

**Why this priority**: Validates the abstraction is genuinely open for extension without modification.

**Independent Test**: Verify that `MailingService` has no direct import of any transport implementation — only the interface token.

**Acceptance Scenarios**:

1. **Given** the transport abstraction is in place, **When** reviewing `MailingService` source, **Then** it imports only the interface/token, not `nodemailer` or `resend` directly.
2. **Given** a new provider class implementing `IMailTransport`, **When** it is wired into the module factory and selected via config, **Then** it works without changes to `MailingService`.

---

### Edge Cases

- What happens when `MAIL_PROVIDER` is set to an unknown value? → Log a warning and fall back to SMTP.
- What happens when `RESEND_API_KEY` is missing while `MAIL_PROVIDER=resend`? → Log an error and treat mailing as disabled for that boot.
- What happens when the SMTP `verify()` fails? → Log warning, mark provider as disabled; subsequent `send()` calls no-op. Verify runs lazily on the first `send()`, not at module startup, so a temporarily unavailable SMTP server does not block app boot.
- What happens if `cc` is omitted from a send call? → Transport providers must handle `cc` as optional without error.
- What if a send method is called concurrently from multiple workers? → Providers are stateless per-send; no shared mutable state issues.
- What happens when a provider `send()` call fails with a transient error (timeout, rate limit)? → Log the error and return silently. No retry. Callers (Bull queue processors) own retry semantics at a higher level.

## Test Suite

Tests are written **before** implementation (TDD). No provider code ships without a passing spec.

### `mailing.service.spec.ts` (new)

Unit tests for `MailingService` with a mock transport injected via `MAIL_TRANSPORT_TOKEN`:

- Service calls `transport.send()` with pre-compiled HTML (not raw template name)
- Subject prefix is prepended when `MAIL_SUBJECT_PREFIX` is set
- Dev email override replaces `to`/`cc` when `NODE_ENV !== production`
- `DEV_EMAIL_DESTINATION` missing → method returns without sending
- `MAIL_ENABLED=false` (transport is `null`) → HTML written to file in development, silent return in production; `transport.send()` never called
- Representative public method (e.g. `sendEnrollmentMail`) passes correct context shape to `compileService.toHtml()`

### `smtp.provider.spec.ts` (new)

Unit tests for `SmtpProvider` with nodemailer mocked:

- `send()` calls `transporter.sendMail()` with `from`, `to`, `cc`, `subject`, `html`
- `cc` omitted → passed as `undefined`, no error thrown
- Constructor reads `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` from config; does NOT call `verify()` at construction
- First `send()` triggers `verify()`; subsequent calls skip it (cached flag)
- `verify()` failure → provider logs warning, marks itself disabled, `send()` no-ops for all subsequent calls

### `resend.provider.spec.ts` (new)

Unit tests for `ResendProvider` with Resend SDK mocked:

- `send()` calls `resend.emails.send()` with correct shape
- `cc` omitted → not included in Resend call
- Missing `RESEND_API_KEY` → provider logs error, `send()` no-ops gracefully
- Resend SDK throws → error is caught and logged, does not propagate

### Existing tests

- `clubenrollment.template.spec.ts` — unchanged, must stay green throughout

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support selecting a mail transport provider via a single environment variable (`MAIL_PROVIDER`: `smtp` | `resend`).
- **FR-002**: System MUST default to SMTP transport when `MAIL_PROVIDER` is absent.
- **FR-003**: System MUST deliver emails via Resend when `MAIL_PROVIDER=resend` and `RESEND_API_KEY` is set.
- **FR-004**: System MUST continue delivering emails via nodemailer SMTP when `MAIL_PROVIDER=smtp`, using `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`.
- **FR-005**: All 16 existing `MailingService` public methods MUST retain identical signatures and behaviour.
- **FR-006**: Template compilation (Pug → HTML) MUST remain in `MailingService`, not inside any transport provider.
- **FR-007**: Dev email override logic (`DEV_EMAIL_DESTINATION`, non-production redirect) MUST remain in `MailingService`.
- **FR-008**: The disabled-mailing file-save path (`MAIL_ENABLED=false` + `NODE_ENV=development`) MUST remain functional regardless of configured provider.
- **FR-009**: Transport providers MUST be interchangeable via a shared interface without modifying `MailingService`.
- **FR-010**: The `resend` package MUST be added as a dependency; `nodemailer` MUST NOT be removed.
- **FR-011**: `.env.example` MUST be updated to document `MAIL_PROVIDER` and `RESEND_API_KEY` alongside existing mail vars.
- **FR-012**: On any send failure (network error, API rejection, timeout), providers MUST log the error and return silently — no retry, no exception propagation to the caller.
- **FR-013**: `SmtpProvider` MUST initialize the nodemailer transporter lazily — `verify()` runs on the first `send()` call, not at module startup. Result is cached; subsequent calls skip re-verification.

### Key Entities

- **IMailTransport**: Interface defining the contract for any mail transport provider (`send(options): Promise<void>`).
- **MailSendOptions**: Data shape passed to providers (`from`, `to`, `cc?`, `subject`, `html`).
- **SmtpProvider**: Concrete implementation wrapping nodemailer; reads `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`.
- **ResendProvider**: Concrete implementation wrapping Resend SDK; reads `RESEND_API_KEY`.
- **MAIL_TRANSPORT_TOKEN**: NestJS injection token used to inject the active provider into `MailingService`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Switching mail provider requires only environment variable changes — zero code changes and zero redeployment of application logic.
- **SC-002**: All existing email delivery paths continue working after the refactor (verified by existing unit tests passing without modification).
- **SC-003**: A new provider can be added by creating one file and one line in the module factory — no changes to `MailingService` or its callers.
- **SC-004**: `MailingService` source contains no direct import of `nodemailer` or `resend` after the refactor.
- **SC-005**: Both SMTP and Resend paths are exercisable in a development environment without a live mail server (via `MAIL_ENABLED=false` file-save mode).
- **SC-006**: Unit test suites for `MailingService`, `SmtpProvider`, and `ResendProvider` exist and pass before any provider implementation is merged. Each provider is tested in full isolation with no live network calls.

## Assumptions

- `MAIL_PROVIDER` defaults to `smtp` to ensure zero-change backward compatibility for existing deployments.
- The Resend SDK (`resend` npm package v4.x) is publicly available and compatible with Node.js 20+.
- Template compilation behaviour (Pug → HTML via `CompileService`) is not changing as part of this feature.
- The `cc` field is optional in all provider implementations, consistent with how it is used today (only `sendEnrollmentMail` sets it).
- Subject prefix (`MAIL_SUBJECT_PREFIX`) and dev-override (`DEV_EMAIL_DESTINATION`) config vars remain in `MailingService` scope.
- Mobile/frontend code is unaffected — this change is entirely within `libs/backend/mailing/`.

## Clarifications

### Session 2026-06-09

- Q: What should providers do when a send call fails with a transient error (network timeout, rate limit)? → A: Log error, return silently — no retry. Bull queue processors own retry semantics at a higher level.
- Q: When should `SmtpProvider` run nodemailer `verify()`? → A: Lazily on first `send()`, result cached. Keeps module startup fast and consistent with ResendProvider (no verify step).
