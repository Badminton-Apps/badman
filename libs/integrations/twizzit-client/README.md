# @badman/integrations-twizzit-client

Read-only API client for the Twizzit membership platform. Used by Badman worker apps to sync contacts, memberships, and organisations.

---

## TL;DR

```ts
import { TwizzitClient } from "@badman/integrations-twizzit-client";

const client = new TwizzitClient({
  credentials: {
    username: process.env.TWIZZIT_API_USER!,
    password: process.env.TWIZZIT_API_PASS!,
  },
  // Optional. Default is https://app.twizzit.com/v2/api.
  baseUrl: process.env.TWIZZIT_API,
});

await client.authenticate();
const [org] = await client.getOrganizations();
const contacts = await client.getContacts({ pageSize: 100 });
const memberships = await client.getMemberships();
const types = await client.getMembershipTypes();
const fields = await client.getExtraFields();

// Federation-agnostic shape — memberId surfaced as a top-level field,
// camelCase everywhere, lowercase locale keys (en/nl/fr).
console.log(contacts[0].memberId); // → "50082790" or null
```

The client never writes to a database, never reads `process.env` itself, and never logs your password or token.

---

## Configuration reference

| Field                       | Type               | Required | Default                          |
| --------------------------- | ------------------ | -------- | -------------------------------- |
| `credentials.username`      | `string`           | yes      | —                                |
| `credentials.password`      | `string`           | yes      | —                                |
| `baseUrl`                   | `string`           | no       | `https://app.twizzit.com/v2/api` |
| `organizationId`            | `number`           | no       | Resolved lazily on first call    |
| `retry.maxRateLimitRetries` | `number`           | no       | `3`                              |
| `retry.maxRetryBudgetMs`    | `number`           | no       | `120_000`                        |
| `retry.initialBackoffMs`    | `number`           | no       | `1_000`                          |
| `retry.maxBackoffMs`        | `number`           | no       | `30_000`                         |
| `logger`                    | `Logger` interface | no       | No-op                            |

Pass `process.env.X` from your consumer (worker app) — the lib intentionally does **not** read `process.env`.

---

## Endpoint cheatsheet

| Method                  | Twizzit endpoint       | Returns                          | Notes                                                                |
| ----------------------- | ---------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `authenticate()`        | `POST /authenticate`   | `void` (token cached internally) | Auto-refreshes at ≥80% JWT lifetime; reactive 401-retry as fallback. |
| `getOrganizations()`    | `GET /organizations`   | `Organization[]`                 | Resolved lazily; cached after first success.                         |
| `getContacts(opts?)`    | `GET /contacts`        | `Contact[]`                      | Paginated via `limit`+`offset`; transparent loop.                    |
| `getMemberships(opts?)` | `GET /memberships`     | `Membership[]`                   | Same.                                                                |
| `getMembershipTypes()`  | `GET /membershipTypes` | `MembershipType[]`               | Single page; reference data.                                         |
| `getExtraFields()`      | `GET /extra-fields`    | `ExtraField[]`                   | Single page; reference data.                                         |

`opts` for list methods: `{ pageSize?: number; maxPages?: number; lastModified?: Date }`. `lastModified` is a placeholder for the not-yet-shipped Twizzit filter — safe to leave unset.

---

## Error handling

Every failure is a typed `TwizzitError` subclass with a `kind` discriminant:

```ts
import { isTwizzitError } from "@badman/integrations-twizzit-client";

try {
  await client.getContacts();
} catch (e) {
  if (!isTwizzitError(e)) throw e;
  switch (e.kind) {
    case "auth":
      /* 401/403 — credentials rejected or expired */ break;
    case "validation":
      /* Zod parse failed — Twizzit schema drifted */ break;
    case "network":
      /* Transport error (ECONNRESET, DNS, etc.)  */ break;
    case "rate-limit":
      /* 429 retry budget exhausted; check e.retryAfterMs */ break;
    case "server":
      /* 5xx from Twizzit; check e.bodyExcerpt     */ break;
    case "client":
      /* 4xx (not 401/429) or max-pages-exceeded   */ break;
  }
}
```

**No error field ever contains** your password, the bearer token, or the `Authorization` header value. This is verified by `test/redact.spec.ts` (T043).

---

## Testing modes

| Mode              | Trigger                                                        | Hits Twizzit?                                                 |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Offline (default) | `nx test integrations-twizzit-client`                          | No — uses `test/__fixtures__/*.json` and injected mock fetch. |
| Live              | `RUN_TWIZZIT_LIVE_TESTS=1 nx test integrations-twizzit-client` | Yes — exercises the same describes against real Twizzit.      |

CI runs offline only. Live mode is for periodic drift detection. When Twizzit ships a new field the live suite fails; the fix is: record a new fixture and bump the Zod schema.

An offline guard (`test/setup.offline.ts`) replaces `globalThis.fetch` with a sentinel that throws immediately unless `RUN_TWIZZIT_LIVE_TESTS=1`. All offline tests must inject their own fetch via `TwizzitClientConfig.fetch`.

---

## Adding a new endpoint

Five steps, one file per step:

1. **Capture a fixture.** `curl` the staging endpoint, save JSON to `test/__fixtures__/<endpoint>.200.json`, anonymise per the policy below.
2. **Write the Zod schema.** Create `src/schemas/<resource>.ts` exporting `<Resource>Schema` (use `.strict()`) and `export type <Resource> = z.infer<typeof <Resource>Schema>`.
3. **Write the endpoint function.** Create `src/endpoints/<resource>.ts` exporting a function that takes `(baseUrl, token, logger, fetchFn?, extraSecrets?)`, calls `httpRequest`, parses with the schema, and returns the typed result.
4. **Wire it on `TwizzitClient`.** Add a `get<Resource>()` method in `src/client.ts` using `withAuthRetry`; pass `[this.credentials.password]` as `extraSecrets` so both token and password are redacted from error fields.
5. **Add tests** to `test/`: happy path from fixture, broken fixture → `TwizzitValidationError`, 401 retry, 429 exhaustion, 5xx surfacing, network error, no-credential-leak assertion.

---

## Fixture anonymisation policy

When capturing a fixture from staging Twizzit:

- **Keep**: numeric `id`, `contact-id`, `club-id`, `membership-type-id`, `extra-field.id`, `Member ID` value, `date-of-birth`, `gender`, `nationality`, `language`, structural fields, enum-like strings.
- **Replace** with synthetic values: `name`, all `email-*` addresses, all `mobile-*` numbers, `phone`, `address` fields, `account-number`, `registry-number`, `number`.
- Replacement values must be visibly synthetic (`Test One`, `test1@example.invalid`, `Teststraat 1, 1000 Testcity`) so a reviewer can confirm at a glance that no production PII is committed.

---

## Boundaries

This lib **does not**:

- Connect to PostgreSQL or read/write Sequelize models.
- Import `@badman/backend-database`, `@badman/backend-graphql`, or `@badman/backend-queue`.
- Define NestJS decorators, modules, or providers.
- Read `process.env` directly.
- Cache anything to disk or Redis.
- Push data back to Twizzit (read-only in v1).

The import boundary is enforced at test time by `test/no-forbidden-imports.spec.ts` (SC-008).
