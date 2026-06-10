# Research: Multi-Provider Mail Transport

## Decision 1: Resend SDK API surface

**Decision**: Use `resend` npm package (v4.x). Instantiate `new Resend(apiKey)`. Call `resend.emails.send({ from, to, cc?, subject, html })`.

**Key finding**: Resend SDK does NOT throw on send failure. It returns `{ data: EmailResponseSuccess | null, error: ErrorResponse | null }`. The provider MUST check `error !== null` and log accordingly — do not assume a thrown exception is the only failure path.

**Rationale**: Official SDK pattern; avoids try/catch for expected failure modes.

**Alternatives considered**: Raw HTTP via `fetch` — rejected (no benefit, loses SDK type safety and retry/backoff handling).

---

## Decision 2: NestJS optional injection for null transport

**Decision**: Use `@Optional() @Inject(MAIL_TRANSPORT_TOKEN)` in `MailingService` constructor. The module factory returns `null` when `MAIL_ENABLED=false`, which NestJS resolves cleanly with `@Optional()`.

**Rationale**: `@Optional()` is the idiomatic NestJS way to allow a `null` injectable. Without it, NestJS throws on a `null` provider value.

**Alternatives considered**: Sentinel no-op object implementing `IMailTransport` — rejected (null check is cleaner and more explicit in `_sendMail`).

---

## Decision 3: SmtpProvider lazy verify strategy

**Decision**: `SmtpProvider` creates the nodemailer transporter in the constructor (cheap, no I/O), but calls `verify()` only on the first `send()` invocation. A `_verified: boolean | null` flag tracks state (`null` = not yet checked, `true` = ok, `false` = failed).

**Rationale**: Keeps module startup fast. Consistent with `ResendProvider` which has no verify step. A temporarily unavailable SMTP server at boot does not kill the app.

**Alternatives considered**: Verify in constructor — rejected (blocks app startup on SMTP outage).

---

## Decision 4: Test mocking strategy

**Decision**:

- `SmtpProvider` tests: `jest.mock('nodemailer')` + `jest.spyOn` on `createTransport` return value
- `ResendProvider` tests: `jest.mock('resend')` + mock `emails.send`
- `MailingService` tests: inject mock object `{ send: jest.fn() }` via `MAIL_TRANSPORT_TOKEN` in `Test.createTestingModule`

**Rationale**: No live network calls in unit tests. Provider tests isolate SDK behaviour. Service tests isolate orchestration logic.

---

## No outstanding unknowns

All spec items resolved. No NEEDS CLARIFICATION remaining.
