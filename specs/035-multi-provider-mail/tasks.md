# Tasks: Multi-Provider Mail Transport

**Input**: Design documents from `specs/035-multi-provider-mail/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD explicitly required by spec. Test tasks are WRITE-FIRST — tests MUST fail (RED) before implementation begins.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to user story (US1=Resend, US2=SMTP, US3=Disabled path, US4=Extensibility)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and scaffold provider directory before any TDD work starts.

- [ ] T001 [P] Add `"resend": "^4.0.0"` to root `package.json` dependencies
- [ ] T002 [P] Add `"resend": "^4.0.0"` to `libs/backend/mailing/package.json` dependencies
- [ ] T003 [P] Update `.env.example` — add `MAIL_PROVIDER=smtp` and `RESEND_API_KEY=` lines under the `# Mail` section

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared interface and injection token. Write the `MailingService` test suite covering all story paths through a mock transport.

**⚠️ CRITICAL**: No provider work can begin until T004/T005 are done. T006 (service spec) must be RED before the service refactor in Phase 5.

- [ ] T004 Create `libs/backend/mailing/src/providers/mail-transport.interface.ts` — define `MAIL_TRANSPORT_TOKEN`, `MailSendOptions`, and `IMailTransport` per `contracts/mail-transport.md`
- [ ] T005 Create `libs/backend/mailing/src/providers/index.ts` barrel — export `MAIL_TRANSPORT_TOKEN`, `IMailTransport`, `MailSendOptions`
- [ ] T006 Write `libs/backend/mailing/src/services/mailing/mailing.service.spec.ts` (TDD RED) — covers: transport `send()` called with pre-compiled HTML; subject prefix prepended; dev override replaces `to`/`cc`; `DEV_EMAIL_DESTINATION` absent → early return; transport `null` + dev → file written, `send()` not called; transport `null` + prod → silent return; `sendEnrollmentMail` passes correct context to `compileService.toHtml()`

**Checkpoint**: `nx test backend-mailing` shows T006 failing with "cannot find module" or "transport is not a function" — expected RED state.

---

## Phase 3: User Story 2 — Keep SMTP Working (Priority: P1)

**Goal**: `SmtpProvider` wraps nodemailer with lazy verify; existing SMTP config unchanged.

**Independent Test**: Set `MAIL_PROVIDER` absent, `MAIL_ENABLED=true`, trigger any send — email routes through nodemailer SMTP.

### Tests (TDD — write first, must be RED before T008)

- [ ] T007 Write `libs/backend/mailing/src/providers/smtp.provider.spec.ts` (TDD RED) — covers: `send()` calls `transporter.sendMail()` with `from/to/cc/subject/html`; `cc` absent → no error; constructor does NOT call `verify()`; first `send()` triggers `verify()`; second `send()` skips verify; `verify()` returns false → warning logged, `send()` no-ops; `verify()` throws → same no-op path

### Implementation

- [ ] T008 [US2] Implement `libs/backend/mailing/src/providers/smtp.provider.ts` — `SmtpProvider implements IMailTransport`: constructor creates transporter (no verify), lazy `_verified: boolean | null` flag, `send()` verifies on first call, `sendMail()` on success, logs+returns on failure. Run `nx test backend-mailing --testPathPattern smtp` → GREEN.

**Checkpoint**: `smtp.provider.spec.ts` GREEN. `mailing.service.spec.ts` still RED (service not yet refactored).

---

## Phase 4: User Story 1 — Switch to Resend (Priority: P1)

**Goal**: `ResendProvider` wraps Resend SDK; selected via `MAIL_PROVIDER=resend`.

**Independent Test**: Set `MAIL_PROVIDER=resend`, valid `RESEND_API_KEY`, trigger `sendTestMail()` — email appears in Resend dashboard.

### Tests (TDD — write first, must be RED before T010)

- [ ] T009 [P] Write `libs/backend/mailing/src/providers/resend.provider.spec.ts` (TDD RED) — covers: `send()` calls `resend.emails.send()` with `from/to/subject/html`; `cc` provided → included; `cc` absent → not included; `RESEND_API_KEY` missing → logs error, `send()` returns without SDK call; SDK returns `{ error: {...} }` → error logged, resolves without throw; SDK returns `{ data: { id }, error: null }` → success

### Implementation

- [ ] T010 [P] [US1] Implement `libs/backend/mailing/src/providers/resend.provider.ts` — `ResendProvider implements IMailTransport`: constructor instantiates `new Resend(apiKey)` or logs error+sets `_resend=null`; `send()` early-returns if `_resend` null; calls `resend.emails.send({ from, to, ...(cc ? {cc} : {}), subject, html })`; checks `error` in response and logs if present. Run `nx test backend-mailing --testPathPattern resend` → GREEN.

**Checkpoint**: Both provider specs GREEN. Service spec still RED.

---

## Phase 5: User Story 3 — Disabled Path + Service Refactor (Priority: P2)

**Goal**: Refactor `MailingService` to inject `IMailTransport`; all three test suites go GREEN including the disabled-path coverage in US3.

**Independent Test**: Set `MAIL_ENABLED=false`, `NODE_ENV=development`, trigger `sendTestMail()` — `mails/test.html` written, no network call.

- [ ] T011 [US3] Refactor `libs/backend/mailing/src/services/mailing/mailing.service.ts` — remove `nodemailer` import, `_transporter`, `_mailingEnabled`, `initialized`, `_setupMailing()`; add `@Optional() @Inject(MAIL_TRANSPORT_TOKEN) private readonly mailTransport: IMailTransport | null` to constructor; rewrite `_sendMail<T>()`: apply subject prefix → inject `clientUrl` → if `!mailTransport` compile+save-to-file (dev) or silent return (prod) → apply dev override → compile HTML via `lastValueFrom(compileService.toHtml(...))` → call `mailTransport.send({ from, to, cc, subject, html })`. Run `nx test backend-mailing --testPathPattern mailing.service` → GREEN.
- [ ] T012 [US3] Update `libs/backend/mailing/src/mailing.module.ts` — add `MAIL_TRANSPORT_TOKEN` useFactory provider: returns `null` when `MAIL_ENABLED=false`; returns `new ResendProvider(configService)` when `MAIL_PROVIDER=resend`; logs warning for unknown provider value; returns `new SmtpProvider(configService)` as default. Add `ConfigService` to `inject` array.

**Checkpoint**: `nx test backend-mailing` → ALL specs GREEN (service + smtp + resend + clubenrollment template).

---

## Phase 6: User Story 4 — Extensibility Validation (Priority: P3)

**Goal**: Confirm the abstraction holds — `MailingService` has no direct provider imports.

**Independent Test**: Grep `mailing.service.ts` for `nodemailer` or `resend` — zero matches.

- [ ] T013 [US4] Add `smtp.provider.ts` and `resend.provider.ts` to `libs/backend/mailing/src/providers/index.ts` barrel exports
- [ ] T014 [US4] Verify `libs/backend/mailing/src/services/mailing/mailing.service.ts` imports only from `../providers` (interface/token), not from `nodemailer` or `resend` directly — fix any stray import if found

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Run `nx test backend-mailing` — confirm all 4 spec files pass, zero regressions
- [ ] T016 [P] Run `nx lint backend-mailing` — fix any lint errors
- [ ] T017 Run `npm install` at repo root to lock `resend` in `package-lock.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T002/T003 all parallel
- **Foundational (Phase 2)**: Depends on Phase 1 (needs `resend` installed for T006 to compile)
  - T004 → T005 → T006 (sequential within phase)
- **US2 — SMTP (Phase 3)**: Depends on T004/T005 (needs interface). T007 → T008 sequential
- **US1 — Resend (Phase 4)**: Depends on T004/T005. T009 → T010 sequential. Phase 3 and Phase 4 can run in parallel (different files)
- **US3 — Service Refactor (Phase 5)**: Depends on T007/T008 AND T009/T010 (both providers must exist). T011 → T012 sequential
- **US4 — Extensibility (Phase 6)**: Depends on Phase 5 complete
- **Polish (Phase 7)**: Depends on all phases complete

### User Story Dependencies

- **US2 (P1, SMTP)**: Can start after Phase 2 — no dependency on US1
- **US1 (P1, Resend)**: Can start after Phase 2 — no dependency on US2 — **parallel with US2**
- **US3 (P2, Disabled path)**: Depends on US1 + US2 complete (service refactor uses both providers)
- **US4 (P3, Extensibility)**: Depends on US3 complete (validates the final architecture)

### Within Each Phase

- Tests written FIRST → must FAIL before implementation → implement → verify GREEN

---

## Parallel Example: US1 + US2 (after Phase 2 complete)

```text
# These run concurrently (different files, no conflicts):
Task A: T007 smtp.provider.spec.ts (RED) → T008 smtp.provider.ts (GREEN)
Task B: T009 resend.provider.spec.ts (RED) → T010 resend.provider.ts (GREEN)
```

---

## Implementation Strategy

### MVP (US1 + US2 first — both P1)

1. Phase 1: Setup (T001–T003, ~5 min)
2. Phase 2: Foundational interface + service spec RED (T004–T006)
3. Phase 3: SmtpProvider RED→GREEN (T007–T008)
4. Phase 4: ResendProvider RED→GREEN (T009–T010) — parallel with Phase 3 if possible
5. Phase 5: Service refactor → all specs GREEN (T011–T012)
6. **STOP and VALIDATE**: `nx test backend-mailing` all green, switch env vars to test both providers

### Incremental Delivery

1. Phase 1–2 → foundation ready
2. Phase 3–4 → both providers implemented and tested in isolation
3. Phase 5 → service wired, all paths covered (US1 + US2 + US3 all working)
4. Phase 6–7 → architecture validated, lint clean

---

## Notes

- [P] tasks touch different files — safe to parallelize
- TDD: RED before GREEN is mandatory per spec SC-006
- `nx test backend-mailing --testPathPattern <name>` to run a single spec during development
- `clubenrollment.template.spec.ts` must stay GREEN throughout (never touch it)
- `MAIL_TRANSPORT_TOKEN` is a Symbol — must be imported from the barrel, not re-declared
