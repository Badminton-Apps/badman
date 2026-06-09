# Implementation Plan: Multi-Provider Mail Transport

**Branch**: `035-multi-provider-mail` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/035-multi-provider-mail/spec.md`

## Summary

Refactor `@badman/backend-mailing` to extract the SMTP transport out of `MailingService` into a swappable provider behind an `IMailTransport` interface. Add `ResendProvider` as a second implementation. Active provider is selected at module init via `MAIL_PROVIDER` env var (`smtp` | `resend`); no code change needed to switch. All 16 public `MailingService` methods and their callers are unchanged. Tests written first (TDD).

## Technical Context

**Language/Version**: TypeScript, Node.js 20+  
**Primary Dependencies**: NestJS 11, nodemailer 6, resend 4.x (new), Jest  
**Storage**: N/A (no DB changes)  
**Testing**: Jest via `nx test backend-mailing`  
**Target Platform**: Linux server (NestJS API + worker-sync)  
**Project Type**: NestJS library (`@badman/backend-mailing`)  
**Performance Goals**: No change — fire-and-forget email delivery  
**Constraints**: No app startup delay; provider init must be lazy for SMTP  
**Scale/Scope**: Single lib, 5 files changed/created, 3 new test files

## Constitution Check

| Principle                     | Status            | Notes                                                                                                                                                       |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Code-First GraphQL        | ✅ Not applicable | No new models or GraphQL types                                                                                                                              |
| II — Translation Discipline   | ✅ Not applicable | No i18n changes                                                                                                                                             |
| III — Transactional Mutations | ✅ Not applicable | No mutations or DB writes                                                                                                                                   |
| IV — Resolver Test Discipline | ✅ Adapted        | No resolver tests here, but same spirit: `Test.createTestingModule`, jest mocks, no live network, `afterEach(jest.restoreAllMocks)`, co-located `*.spec.ts` |
| V — Legacy Frontend Boundary  | ✅ Not applicable | All changes in `libs/backend/mailing/`                                                                                                                      |

No violations. No Complexity Tracking entry required.

## Project Structure

### Documentation (this feature)

```text
specs/035-multi-provider-mail/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── mail-transport.md
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
libs/backend/mailing/src/
  providers/
    mail-transport.interface.ts   ← NEW
    smtp.provider.ts              ← NEW
    smtp.provider.spec.ts         ← NEW (TDD — write first)
    resend.provider.ts            ← NEW
    resend.provider.spec.ts       ← NEW (TDD — write first)
    index.ts                      ← NEW barrel
  services/mailing/
    mailing.service.ts            ← UPDATED (inject IMailTransport, inline HTML compile)
    mailing.service.spec.ts       ← NEW (TDD — write first)
  mailing.module.ts               ← UPDATED (register MAIL_TRANSPORT_TOKEN factory)
  index.ts                        ← unchanged

libs/backend/mailing/package.json ← UPDATED (add resend)
package.json (root)               ← UPDATED (add resend)
.env.example                      ← UPDATED (add MAIL_PROVIDER, RESEND_API_KEY)
```

**Structure Decision**: Single lib, co-located tests per Constitution Principle IV spirit. Providers sub-folder mirrors `compile` and `services` pattern already in the lib.

## Implementation Sequence (TDD order)

### Step 1 — Interface (no tests needed)

Create `providers/mail-transport.interface.ts`:

```typescript
export const MAIL_TRANSPORT_TOKEN = Symbol("MAIL_TRANSPORT_TOKEN");

export interface MailSendOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

export interface IMailTransport {
  send(options: MailSendOptions): Promise<void>;
}
```

### Step 2 — Write `mailing.service.spec.ts` (RED)

Test `MailingService` with a mock transport. Cases:

- Transport `send()` called with pre-compiled HTML string (not template name)
- Subject prefix prepended when `MAIL_SUBJECT_PREFIX` set
- Dev override: `to`/`cc` replaced with `DEV_EMAIL_DESTINATION` when `NODE_ENV !== production`
- `DEV_EMAIL_DESTINATION` absent → returns without calling `send()`
- Transport is `null` + `NODE_ENV=development` → HTML written to file, `send()` never called
- Transport is `null` + `NODE_ENV=production` → silent return, no file write, `send()` never called
- `sendEnrollmentMail` passes correct context shape to `compileService.toHtml()`

Module setup mirrors Constitution IV pattern:

```typescript
Test.createTestingModule({
  providers: [
    MailingService,
    { provide: MAIL_TRANSPORT_TOKEN, useValue: mockTransport },
    { provide: CompileService, useValue: mockCompile },
    { provide: ConfigService, useValue: mockConfig },
  ],
});
```

### Step 3 — Write `smtp.provider.spec.ts` (RED)

Mock nodemailer via `jest.mock('nodemailer')`. Cases:

- `send()` calls `transporter.sendMail()` with `{ from, to, cc, subject, html }`
- `cc` absent → no error, `sendMail` called without cc field
- Constructor does NOT call `verify()` (lazy init confirmed)
- First `send()` triggers `verify()`; second `send()` skips it
- `verify()` returns `false` → warning logged, `send()` no-ops, `sendMail` not called
- `verify()` throws → same as false path: warning logged, no-op

### Step 4 — Write `resend.provider.spec.ts` (RED)

Mock Resend SDK via `jest.mock('resend')`. Cases:

- `send()` calls `resend.emails.send()` with `{ from, to, subject, html }`
- `cc` provided → included in call
- `cc` absent → not included (or undefined, not null)
- `RESEND_API_KEY` missing → provider logs error, `send()` returns without calling SDK
- SDK returns `{ error: { message: '...' } }` → error logged, resolves (no throw)
- SDK returns `{ data: { id: '...' }, error: null }` → success, no error logged

### Step 5 — Implement `MailingService` (GREEN)

Update `mailing.service.ts`:

- Remove: `nodemailer` import, `_transporter` field, `_mailingEnabled`, `initialized`, `_setupMailing()`
- Add constructor param: `@Optional() @Inject(MAIL_TRANSPORT_TOKEN) private readonly mailTransport: IMailTransport | null`
- Update `_sendMail<T>()`:
  1. Apply subject prefix
  2. Inject `clientUrl` into context
  3. If `!this.mailTransport` → compile HTML, write to file (dev only), return
  4. Apply dev override (unchanged logic)
  5. Compile HTML: `const html = await lastValueFrom(this.compileService.toHtml(options.template, { locals: options.context }))`
  6. `await this.mailTransport.send({ from: options.from, to: options.to, cc: options.cc, subject: options.subject, html })`

### Step 6 — Implement `SmtpProvider` (GREEN)

```typescript
@Injectable()
export class SmtpProvider implements IMailTransport {
  private _transporter: nodemailer.Transporter;
  private _verified: boolean | null = null;

  constructor(private configService: ConfigService<ConfigType>) {
    this._transporter = nodemailer.createTransport({
      host: configService.get("MAIL_HOST"),
      port: 465,
      auth: { user: configService.get("MAIL_USER"), pass: configService.get("MAIL_PASS") },
    });
  }

  async send(options: MailSendOptions): Promise<void> {
    if (this._verified === null) {
      try {
        this._verified = !!(await this._transporter.verify());
      } catch {
        this._verified = false;
        logger.warn("SMTP verify failed; mailing disabled");
      }
    }
    if (!this._verified) return;
    await this._transporter.sendMail(options);
  }
}
```

### Step 7 — Implement `ResendProvider` (GREEN)

```typescript
@Injectable()
export class ResendProvider implements IMailTransport {
  private _resend: Resend | null = null;

  constructor(configService: ConfigService<ConfigType>) {
    const apiKey = configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      logger.error("RESEND_API_KEY missing; mailing disabled");
      return;
    }
    this._resend = new Resend(apiKey);
  }

  async send(options: MailSendOptions): Promise<void> {
    if (!this._resend) return;
    const { error } = await this._resend.emails.send({
      from: options.from,
      to: options.to,
      ...(options.cc ? { cc: options.cc } : {}),
      subject: options.subject,
      html: options.html,
    });
    if (error) logger.error("Resend send failed", error);
  }
}
```

### Step 8 — Update `MailingModule`

```typescript
{
  provide: MAIL_TRANSPORT_TOKEN,
  useFactory: (configService: ConfigService<ConfigType>) => {
    if (!(configService.get<boolean>('MAIL_ENABLED') ?? false)) return null;
    const provider = configService.get<string>('MAIL_PROVIDER') ?? 'smtp';
    if (provider === 'resend') return new ResendProvider(configService);
    if (provider !== 'smtp') logger.warn(`Unknown MAIL_PROVIDER "${provider}"; falling back to smtp`);
    return new SmtpProvider(configService);
  },
  inject: [ConfigService],
}
```

### Step 9 — Package + env updates

- `libs/backend/mailing/package.json`: add `"resend": "^4.0.0"`
- Root `package.json`: add `"resend": "^4.0.0"`
- `.env.example`: add `MAIL_PROVIDER=smtp` and `RESEND_API_KEY=`

### Step 10 — Verify all tests green

```bash
nx test backend-mailing
```

All new specs + `clubenrollment.template.spec.ts` must pass.

## Complexity Tracking

No constitution violations. No entry required.
