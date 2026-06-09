# Data Model: Multi-Provider Mail Transport

No database entities or migrations. The "model" for this feature is a set of TypeScript interfaces and their contracts.

## Core Interface: `IMailTransport`

```
IMailTransport
├── send(options: MailSendOptions): Promise<void>
```

- **Invariant**: `send()` MUST never throw or reject. All errors are logged internally and swallowed.
- **Invariant**: `send()` is idempotent from the caller's perspective — the caller does not track delivery state.

## `MailSendOptions`

| Field     | Type                 | Required | Notes                                            |
| --------- | -------------------- | -------- | ------------------------------------------------ |
| `from`    | `string`             | Yes      | Sender address, e.g. `info@badman.app`           |
| `to`      | `string \| string[]` | Yes      | One or more recipient addresses                  |
| `cc`      | `string \| string[]` | No       | Carbon-copy; omit when unused                    |
| `subject` | `string`             | Yes      | Already prefix-adjusted before reaching provider |
| `html`    | `string`             | Yes      | Fully rendered HTML from `CompileService`        |

## Provider States

### `SmtpProvider`

```
State: _verified
  null  → not yet verified (first send() pending)
  true  → verified, transporter ready
  false → verification failed, all sends are no-ops
```

### `ResendProvider`

```
State: _ready
  true  → API key present, Resend client instantiated
  false → API key missing, all sends are no-ops
```

## Injection Token

```
MAIL_TRANSPORT_TOKEN: Symbol("MAIL_TRANSPORT_TOKEN")

Resolved by MailingModule useFactory:
  MAIL_ENABLED=false           → null
  MAIL_PROVIDER=resend         → ResendProvider
  MAIL_PROVIDER=smtp (default) → SmtpProvider
```

## No migrations required

This feature adds no database tables, columns, or indexes.
