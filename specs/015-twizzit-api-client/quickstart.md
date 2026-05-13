# Quickstart: Twizzit API Client

**Lib**: `@badman/integrations-twizzit-client` (alias TBD by Nx generator) — lives at `libs/integrations/twizzit-client`.

This page mirrors what will ship as the lib's `README.md`. It captures the developer-facing contract decided during `/speckit-plan` (specs/015-twizzit-api-client). The recipe at the bottom is what SC-006 asks us to publish.

---

## TL;DR

```ts
import { TwizzitClient, getMemberId } from "@badman/integrations-twizzit-client";

const client = new TwizzitClient({
  credentials: {
    username: process.env.TWIZZIT_USERNAME!,
    password: process.env.TWIZZIT_PASSWORD!,
  },
  // Optional. Default is https://app.twizzit.com/v2/api.
  baseUrl: process.env.TWIZZIT_BASE_URL,
});

await client.authenticate();
const [org] = await client.getOrganizations();
const contacts = await client.getContacts({ pageSize: 100 });
const memberships = await client.getMemberships();
const types = await client.getMembershipTypes();
const fields = await client.getExtraFields();

console.log(getMemberId(contacts[0])); // → "50082790" or null
```

The client never writes to a database, never reads `process.env` itself, and never logs your password or token.

---

## Configuration reference

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `credentials.username` | `string` | yes | — |
| `credentials.password` | `string` | yes | — |
| `baseUrl` | `string` | no | `https://app.twizzit.com/v2/api` |
| `organizationId` | `number` | no | Resolved lazily on first call |
| `retry.maxRateLimitRetries` | `number` | no | `3` |
| `retry.maxRetryBudgetMs` | `number` | no | `120_000` |
| `retry.initialBackoffMs` | `number` | no | `1_000` |
| `retry.maxBackoffMs` | `number` | no | `30_000` |
| `logger` | `Logger` interface | no | No-op |

Pass `process.env.X` from your consumer (worker app) — the lib intentionally does **not** read `process.env`.

---

## Endpoint cheatsheet

| Method | Twizzit endpoint | Returns | Notes |
|--------|------------------|---------|-------|
| `authenticate()` | `POST /authenticate` | `void` (token cached internally) | Auto-refreshes at ≥80 % JWT lifetime; reactive 401-retry as fallback. |
| `getOrganizations()` | `GET /organizations` | `Organization[]` | Cached after first success. |
| `getContacts(opts?)` | `GET /contacts` | `Contact[]` | Paginated via `limit`+`offset`; transparent loop. |
| `getMemberships(opts?)` | `GET /memberships` | `Membership[]` | Same. |
| `getMembershipTypes()` | `GET /membershipTypes` | `MembershipType[]` | Single page; reference data. |
| `getExtraFields()` | `GET /extra-fields` | `ExtraField[]` | Single page; reference data. |

`opts` for list methods: `{ pageSize?: number; maxPages?: number; lastModified?: Date }`. `lastModified` is a placeholder for the not-yet-shipped Twizzit filter (gap Q1) — safe to leave unset.

---

## Error handling

Every failure is a typed `TwizzitError` subclass with a `kind` discriminant:

```ts
try {
  await client.getContacts();
} catch (e) {
  if (!isTwizzitError(e)) throw e;
  switch (e.kind) {
    case "auth": /* 401/403 final */ break;
    case "validation": /* zod failed — Twizzit drifted */ break;
    case "network": /* transport blew up */ break;
    case "rate-limit": /* 429 budget exhausted */ break;
    case "server": /* 5xx */ break;
    case "client": /* 4xx other than 401/429, OR max-pages-exceeded */ break;
  }
}
```

**Construction-time guarantee**: error messages built by the lib do NOT string-interpolate your password or the bearer token. `bodyExcerpt` is a plain ~200-char truncation of the response body — it is NOT deep-scrubbed for secrets. *(2026-05-13: the previously-shipped `redact()` pipeline + `redact.spec.ts` grep gate were retired as over-engineering — see [research.md](../../specs/015-twizzit-api-client/research.md) R12. Twizzit responses don't echo credentials; the consumer worker handles platform-level structured-logging redaction.)*

---

## Testing strategy

Two modes:

| Mode | Trigger | Hits Twizzit? |
|------|---------|---------------|
| Offline (default) | `nx test integrations-twizzit-client` | No — uses `test/__fixtures__/*.json`. |
| Live | `RUN_TWIZZIT_LIVE_TESTS=1 nx test integrations-twizzit-client` | Yes — exercises the same describes against staging Twizzit. |

CI runs offline only. Live mode is for periodic drift detection — when staging Twizzit ships a new field, the live suite fails, and the fix is "record a new fixture + bump the schema".

---

## Adding a new endpoint (SC-006 recipe)

Five steps. Each step is one file change.

1. **Capture a fixture from staging.** Hit the new endpoint with `curl` or a one-off script; save the JSON under `test/__fixtures__/<endpoint>.200.json`. Anonymise per the policy below.
2. **Write the zod schema.** Create `src/schemas/<resource>.ts` exporting `<Resource>Schema` and `export type <Resource> = z.infer<typeof <Resource>Schema>`. Use `.strict()` everywhere.
3. **Write the endpoint function.** Create `src/endpoints/<resource>.ts` exporting a method that takes `(http: HttpLayer, opts?: <Opts>)`, calls the HTTP layer, parses the response with the schema, and returns the typed result. Wire it onto `TwizzitClient` in `src/client.ts`.
4. **Add unit + fixture tests** to `test/client.spec.ts`: happy path, schema failure (synthetic broken fixture), 401 retry path, 429 honour-retry-after, 5xx surfacing, network error. Use `axios-mock-adapter` bound to the lib's internal `AxiosInstance` (the lib exposes it via a testability seam).
5. **Add a live test** to `test/client.live.spec.ts` wrapped in `describe.skip` unless `RUN_TWIZZIT_LIVE_TESTS=1`.

---

## Fixture anonymisation policy

When capturing a fixture from staging Twizzit:

- **Keep**: numeric `id`, `contact-id`, `club-id`, `membership-type-id`, `extra-field.id`, `Member ID` value, `date-of-birth`, `gender`, `nationality`, `language`, structural fields, enum-like strings.
- **Replace** with synthetic values: `name`, all `email-*` addresses, all `mobile-*` numbers, `phone`, `address` (street/number/box/postalCode/city), `account-number`, `registry-number`, `number` (federation-side).
- Replacement values should be visibly synthetic (e.g. `Test One`, `test1@example.invalid`, `Teststraat 1, 1000 Testcity`) so a reviewer sees at a glance that the fixture isn't production PII.

If a fixture would still leak information even with the rules above, anonymise more aggressively — never less.

---

## Boundaries

The lib **does not**:

- Connect to PostgreSQL or read/write Sequelize models.
- Import `@badman/backend-database`, `@badman/backend-graphql`, `@badman/backend-queue`.
- Define NestJS decorators, modules, or providers.
- Read `process.env` directly.
- Cache anything to disk or Redis.
- Push back to Twizzit (read-only in v1).

A unit test (`test/no-forbidden-imports.spec.ts`) enforces the import boundary at build time (SC-008).

---

## Phase 0 — confirm before going live

These items are tracked in `tasks.md` once `/speckit-tasks` runs. They do **not** block development of the lib (the design accommodates each unknown), but they MUST be answered before consumer code is written against this lib in a later phase.

- [ ] Confirm with Twizzit (Philippe / PandaPanda) the rate-limit numbers for the staging key and the expected production allocation (gap Q3).
- [ ] Confirm whether the `last-modified` filter is shipped (gap Q1); update `ContactsQuery.lastModified` documentation if it has a non-obvious shape.
- [ ] Confirm soft-delete representation (gap Q5) on memberships and contacts; if Twizzit emits a new field, the lib's first live run will surface it.
- [ ] Confirm whether a `/clubs` endpoint exists in the BV-key Swagger (gap Q6); if so, add it via the recipe.
- [ ] Confirm Badminton Vlaanderen has provisioned a dedicated API key for Badman in 1Password, separate from any human-test key (FR-001).
