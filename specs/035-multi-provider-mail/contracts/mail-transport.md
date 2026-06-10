# Contract: IMailTransport

Internal interface contract between `MailingService` and transport provider implementations.

## Interface

```typescript
export interface IMailTransport {
  send(options: MailSendOptions): Promise<void>;
}

export interface MailSendOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}
```

## Provider obligations

| Rule              | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| Never throw       | `send()` MUST catch all errors internally, log them, and resolve (not reject) |
| No retry          | On transient failure, log and return — do not retry                           |
| cc optional       | `cc` absent or undefined MUST be handled without error                        |
| HTML pre-compiled | Providers receive fully rendered HTML; they MUST NOT compile templates        |
| No side effects   | Providers MUST NOT mutate `options`                                           |

## MailingService obligations

| Rule                | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| Compile before send | HTML MUST be compiled from template before calling `transport.send()`           |
| Null check          | When transport is `null` (disabled), MUST skip `send()` entirely                |
| Dev override        | Non-production `to`/`cc` replacement happens in service BEFORE calling provider |
| Subject prefix      | Applied in service BEFORE calling provider                                      |

## Injection

- Token: `MAIL_TRANSPORT_TOKEN` (Symbol)
- Registered by: `MailingModule` `useFactory`
- Consumed by: `MailingService` via `@Optional() @Inject(MAIL_TRANSPORT_TOKEN)`
- Null value: returned by factory when `MAIL_ENABLED=false`
