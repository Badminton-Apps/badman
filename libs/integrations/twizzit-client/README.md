# @badman/integrations-twizzit-client

Read-only API client for the Twizzit membership platform. Used by Badman worker apps to sync members, memberships, and organisations into Badman without writing to the database from inside the lib.

The lib's public surface is **federation-agnostic**: methods return `Federation*` types (camelCase, lowercase locale keys, normalised). A future non-Twizzit federation can implement the same `FederationGateway` interface and produce the same shapes; consumers code against `FederationGateway`, not against this concrete class.

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

// Federation-agnostic shape — camelCase everywhere, lowercase locale keys (en/nl/fr).
// `memberId` is surfaced as a top-level field on the contact, extracted from
// the contact's extra-fields by the schema transform.
console.log(contacts[0].memberId); // → "50082790" or null
console.log(contacts[0].fullName); // → "Jane Doe"
console.log(types[0].name.en); // → "Competitive member"
```

The client never writes to a database, never reads `process.env` itself, and never string-interpolates your password or token into error messages.

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
| `httpClient`                | `HttpClient`       | no       | Built internally (axios)         |

Pass `process.env.X` from your consumer (worker app) — the lib intentionally does **not** read `process.env`. `httpClient` is a test seam: inject a pre-configured `AxiosInstance` (e.g. wrapped by `axios-mock-adapter`) to bypass the internal HTTP setup.

---

## Endpoint cheatsheet

| Method                  | Twizzit endpoint        | Returns                          | Notes                                                                                                                   |
| ----------------------- | ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `authenticate()`        | `POST /authenticate`    | `void` (token cached internally) | Proactive refresh at ≥80 % of `valid-till − created-on`; reactive 401-retry as fallback. JWT treated as opaque.         |
| `getOrganizations()`    | `GET /organizations`    | `FederationOrganization[]`       | Resolved lazily; first org cached as the default `organizationId`.                                                      |
| `getContacts(opts?)`    | `GET /contacts`         | `FederationContact[]`            | Paginated via `limit`+`offset`; default fetches every page (production sync). Pass `maxPages` to truncate for sampling. |
| `getMemberships(opts?)` | `GET /memberships`      | `FederationMembership[]`         | Same. Optional `clubId` filter.                                                                                         |
| `getMembershipTypes()`  | `GET /membership-types` | `FederationMembershipType[]`     | Single page; small reference catalogue.                                                                                 |
| `getExtraFields()`      | `GET /extra-fields`     | `FederationExtraField[]`         | Single page; reference data.                                                                                            |

`opts` for paginated list methods: `{ pageSize?: number; maxPages?: number; lastModified?: Date }`. `lastModified` is a placeholder for a Twizzit filter that has been promised but not yet shipped — safe to leave unset; the param is forwarded to the URL when present.

The same methods are also exposed under federation-agnostic names (`fetchOrganizations`, `fetchContacts`, `fetchMemberships`, `fetchMembershipTypes`, `fetchExtraFields`) so consumers can code against `FederationGateway`:

```ts
import { FederationGateway } from "@badman/integrations-twizzit-client";

async function sync(gateway: FederationGateway) {
  const orgs = await gateway.fetchOrganizations();
  // …rest of the sync, ignoring which federation is on the other end
}
```

---

## Generic types

All public entity types live in `src/federation.ts` and are exported from the lib's barrel:

| Type                        | Purpose                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `FederationOrganization`    | `{ id, name }`.                                                                                    |
| `FederationContact`         | Person record: names, dates, address, filtered emails/mobiles, extra fields, top-level `memberId`. |
| `FederationMembership`      | Club↔contact link with type, dates, nullable `clubId`/`seasonId`.                                 |
| `FederationMembershipType`  | Localised name (`en`/`nl`/`fr`), `type` (Continuously/Seasonal/…), cadence fields.                 |
| `FederationExtraField`      | Custom-field catalogue entry: `id`, localised `name`, `type`, `options`, `attributes`.             |
| `FederationExtraFieldValue` | A value attached to a contact/membership, with the `field` metadata embedded.                      |
| `FederationLocalisedName`   | `{ en, nl, fr }` (lowercase locale keys).                                                          |
| `FederationEmail`           | `{ target, address }` (wire `email-N` slots filtered to non-empty).                                |
| `FederationPhone`           | `{ target, countryCode, number }` (wire `cc` → `countryCode`).                                     |
| `FederationAddress`         | Address with localised `country`.                                                                  |

Twizzit's raw kebab-case wire format is an internal implementation detail of the `src/schemas/*` modules; it is **not** exported. See `docs/twizzit/*-swagger.md` for the wire-format contracts.

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
      /* Transport error (ECONNRESET, DNS, etc.) */ break;
    case "rate-limit":
      /* 429 retry budget exhausted; check e.retryAfterMs */ break;
    case "server":
      /* 5xx from Twizzit; check e.bodyExcerpt */ break;
    case "client":
      /* 4xx (not 401/429), or subkind === "pagination-runaway" / "bad-pagination-arg" */ break;
  }
}
```

**Construction-time guarantee**: error messages built by the lib do NOT string-interpolate your password or the bearer token. `bodyExcerpt` is a plain ~200-char truncation of the response body — it is NOT deep-scrubbed for secrets. (Twizzit responses don't echo credentials; the consumer worker handles platform-level structured-logging redaction.)

---

## Testing modes

| Mode              | Trigger                                                                                                              | Hits Twizzit?                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Offline (default) | `nx test integrations-twizzit-client`                                                                                | No — uses `test/__fixtures__/*.json` + `axios-mock-adapter`. |
| Live              | `RUN_TWIZZIT_LIVE_TESTS=1 nx test integrations-twizzit-client --skip-nx-cache --testPathPattern '\.live\.spec\.ts$'` | Yes — exercises all four entity endpoints against staging.   |

CI runs offline only. Live mode is for periodic drift detection. When Twizzit ships a new wire field the live suite throws `TwizzitValidationError` immediately — fix it by updating the raw input schema in `src/schemas/*.ts` (and the matching transform if a new field needs to surface in the generic shape).

An offline guard (`test/setup.offline.ts`) replaces `globalThis.fetch` with a sentinel that throws immediately unless `RUN_TWIZZIT_LIVE_TESTS=1`. Offline tests inject their HTTP mock via the `_http` test accessor on the client:

```ts
import MockAdapter from "axios-mock-adapter";

const client = new TwizzitClient({
  /* … */
});
const mock = new MockAdapter(client._http);
mock.onPost("/authenticate").reply(200 /* … */);
mock.onGet("/organizations").reply(200 /* … */);
```

### Live env vars (existing project convention)

| Var                      | Required   | Purpose                                                      |
| ------------------------ | ---------- | ------------------------------------------------------------ |
| `RUN_TWIZZIT_LIVE_TESTS` | yes (=`1`) | Gate flag that flips the live `describe` block on.           |
| `TWIZZIT_API_USER`       | yes        | Username sent to `POST /authenticate`.                       |
| `TWIZZIT_API_PASS`       | yes        | Password sent to `POST /authenticate`.                       |
| `TWIZZIT_API`            | no         | Override base URL. Default `https://app.twizzit.com/v2/api`. |

If your `.env` already has these (the legacy sync uses them too):

```bash
RUN_TWIZZIT_LIVE_TESTS=1 npx dotenv -e .env -- nx test integrations-twizzit-client --skip-nx-cache --testPathPattern '\.live\.spec\.ts$'
```

---

## Adding a new endpoint

Five steps, roughly one file per step:

1. **Capture a fixture.** `curl` the staging endpoint, save JSON to `test/__fixtures__/<endpoint>.200.json`, anonymise per the policy below.
2. **Write the raw Zod schema + transform.** Create `src/schemas/<resource>.ts`. Define a `RawXxxSchema` (`.strict()`) matching Twizzit's wire format, then export `XxxSchema = RawXxxSchema.transform((raw): FederationXxx => ({ … }))` and `XxxsResponseSchema = z.array(XxxSchema)`.
3. **Define the generic type** in `src/federation.ts` if not already present (`FederationXxx`).
4. **Write the endpoint function.** Create `src/endpoints/<resource>.ts` exporting `async function getXxx(http: HttpClient, opts?: …): Promise<FederationXxx[]>` that calls `http.get` / `http.post`, parses the response with `XxxsResponseSchema`, and returns the typed result. The response interceptor in `src/http.ts` handles all error classification; endpoints don't catch.
5. **Wire it on `TwizzitClient`.** Add `getXxx()` (+ a `fetchXxx()` alias on the `FederationGateway` block) in `src/client.ts`; the method's body is `await this.ensureAuth(); await this.ensureOrganizationId(); return getXxx(this.http, opts);`.
6. **Add tests** under `test/`: happy path from fixture, broken fixture → `TwizzitValidationError` with a path matching a known-broken field, plus one live spec calling the endpoint with `maxPages: 1`.

---

## Fixture anonymisation policy

When capturing a fixture from staging Twizzit:

- **Keep**: numeric `id`, `contact-id`, `club-id`, `membership-type-id`, `extra-field.id`, `Member ID` value, `date-of-birth`, `gender`, `nationality`, `language`, structural fields, enum-like strings.
- **Replace** with synthetic values: `name`, `first-name`, `last-name`, all `email-N` addresses, all `mobile-N` numbers, `home`, `address` fields, `account-number`, `registry-number`, top-level `number` (federation/toernooi.nl id).
- Replacement values must be visibly synthetic (`Test One`, `test1@example.invalid`, `Teststraat 1, 1000 Testcity`) so a reviewer can confirm at a glance that no production PII is committed.

---

## HTTP layer

Internally the lib uses [`axios`](https://github.com/axios/axios) via a thin factory (`src/http.ts` → `createHttpClient`) that returns an `HttpClient` (an alias for `AxiosInstance`, kept off the public name surface). The factory wires:

- `paramsSerializer` producing kebab-bracket arrays (`organization-ids[]=34245`).
- A **request interceptor** that injects `Authorization: Bearer <token>` and the `organization-ids[]` query parameter on every call except `POST /authenticate`.
- A **response interceptor** that classifies HTTP errors into `TwizzitError` variants, handles 401-then-reauth-then-retry-once (skipped for `/authenticate` — bad creds throw `TwizzitAuthError` directly), and implements 429 retry with `Retry-After` bounded by `retry.maxRateLimitRetries`.

The lib does NOT re-export any axios types (`AxiosError`, `AxiosInstance`, etc.) — consumer-visible failures are always `TwizzitError` subclasses, and the HTTP client is referenced only as `HttpClient`.

---

## Boundaries

This lib **does not**:

- Connect to PostgreSQL or read/write Sequelize models.
- Import `@badman/backend-database`, `@badman/backend-graphql`, or `@badman/backend-queue`.
- Define NestJS decorators, modules, or providers.
- Read `process.env` directly.
- Cache anything to disk or Redis.
- Push data back to Twizzit (read-only in v1).
- Re-export `axios` or any axios-flavored types.

The import boundary is enforced at test time by `test/no-forbidden-imports.spec.ts` (SC-008).
