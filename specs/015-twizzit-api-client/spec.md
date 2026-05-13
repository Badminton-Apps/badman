# Feature Specification: Twizzit API Client (Phases 0–2 Foundation)

**Feature Branch**: `015-twizzit-api-client`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "Use docs/twizzit. Spec phases 0, 1, 2 only. Check requirements. api-exploration overview must be validated against the live API. We have API credentials. Goal: typed functions for every Twizzit endpoint we will use, each with zod validation, tests, and error handling. NOT a goal: writing anything to the database."

## Scope clarifier *(read first)*

This specification covers a strict subset of the Twizzit integration roadmap:

- **Phase 0** — confirm prerequisites (credentials in 1Password, staging tenant, rate-limit headroom, `last-modified` filter status).
- **Phase 1** — architect & detailed design for the read-only client layer (auth, request pattern, error taxonomy, federation-agnostic gateway, validation strategy).
- **Phase 2 (scoped)** — deliver an isolated, read-only Twizzit API client library: one typed function per endpoint we exercise, each validated with zod, fully tested (unit + recorded-fixture integration), with structured error handling.

**Out of scope for this spec** (deliberately): persisting any Twizzit data to the Badman database, modifying Sequelize models (`Player`, `Club`, `ClubPlayerMembership`), schema migrations, the `twizzitId` column, membership-type representation refactor, duplicate cleanup, cron scheduling of the sync, decommissioning legacy sync paths, shadow-mode tooling. Those belong to later phases / future specs.

The deliverable here is a **library** that future sync work consumes — not a sync itself.

## Clarifications

### Session 2026-05-12

- Q: Lib location & framework shape — plain TS class vs NestJS dynamic module, and where in the monorepo? → A: Plain TS class at `libs/integrations/twizzit-client`; a NestJS adapter is deferred to a consumer-side phase.
- Q: Pagination contract for list endpoints? → A: Auto-paginate transparently; return the full list. Optional `{ pageSize, maxPages }` to bound. Twizzit uses `limit` and `offset` query params (offset-based pagination). Multi-page fixture exercises the loop.
- Q: Token caching & refresh policy? → A: In-memory per `TwizzitClient` instance. Proactive refresh at ≥80% of the JWT `exp` lifetime; reactive 401-retry as fallback. Never persisted to disk or Redis.
- Q: Logger sink contract? → A: Optional minimal `Logger` interface in config (`{ debug, info, warn, error: (msg, meta?) => void }`); default no-op. Consumer adapts Pino / Nest `Logger` / winston as needed.
- Q: Soft-delete representation (gap Q5) & default zod strictness? → A: Strict zod everywhere — no `.passthrough()` escape hatch. If Twizzit adds a `deleted`/`archived`/`status` flag (or any other field), the next live run surfaces a `TwizzitValidationError`, we record a fixture, bump the schema, and ship a deliberate change. Drift never silently degrades.

### Session 2026-05-13 (continued)

- Q: Should the lib's public surface expose Twizzit-specific entity types, or generic federation-agnostic ones? → A: **Generic only**. Define `FederationContact`, `FederationMembership`, `FederationMembershipType`, `FederationExtraField`, `FederationExtraFieldValue`, `FederationOrganization`, plus value types `FederationLocalisedName`, `FederationEmail`, `FederationPhone`, `FederationAddress` in `src/federation.ts`. Conventions: camelCase fields (no kebab-case in public types), lowercase locale keys (`en/nl/fr`), empty-string wire values normalised to `null`. Twizzit's raw kebab-case shape lives only inside `src/schemas/*` as the *input* to zod transforms; the schema output IS the generic shape. Consumers never see `TwizzitContact` — there is no such type. A future LFBB / non-Twizzit federation supplies its own `FederationGateway` implementation, returning the same generic shapes. The `getMemberId()` helper is removed: `memberId` is now a top-level field on `FederationContact`, extracted by the schema transform from the contact's `extra-field-values`.
- Q: Federation seam naming — "ContactSource" is misleading (also returns memberships/types/fields), "seam.ts" is internal jargon. Better widely-used name? → A: **`FederationGateway`** in `src/gateway.ts`. DDD / Clean-Architecture term for "object that encapsulates access to an external system" — precisely what this is. `FederationContactSource` and `seam.ts` retired.
- Note (post-clarification, live data 2026-05-12): the `/authenticate` response carries `created-on` and `valid-till` (unix-seconds, kebab-case). Observed `valid-till - created-on` = 1800 s; the JWT's own `exp` claim suggests 24 h. **The response body wins** — the lib treats the JWT as opaque and uses `valid-till` for the 80 %-lifetime proactive refresh. `/organizations` confirmed to return `[{ id: 34245, name: "Badminton Belgium" }]` as documented; no schema change needed for that endpoint.

### Session 2026-05-13

- Q: HTTP client choice (previously deferred to plan / research R1)? → A: **axios**. Lean on its built-in utilities (interceptors for `Authorization` + `organization-ids[]` injection, response transformers for zod parsing, error classification via `axios.isAxiosError` + `error.response.status`, optional `axios-retry` for 429 back-off). The lib MUST hide axios behind its own functions so consumers never import axios directly — but inside the lib, use axios primitives instead of reinventing them on top of `fetch`.
- Q: Credential redaction & `redact()` utility? → A: **Remove**. The previously-shipped redact pipeline (every error field constructed via `redact()`, every body excerpt truncated and secret-scrubbed, every logger meta sanitised) was over-engineering for this lib. Production logs run through the consumer (worker app) which already has structured-logging redaction at the platform level. The lib MUST still avoid putting passwords or tokens into error `message` strings *by construction* (e.g. don't string-interpolate the password into an auth-failure message), but the `redact()` helper, the `extraSecrets` param threaded through endpoints, and the end-to-end "no LEAK_ME in serialised output" test gate are all going away. Less surface, less risk of false positives, less maintenance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and resolve organisation id (Priority: P1)

A backend engineer integrating with Twizzit calls a single client function to obtain a JWT using credentials from environment-managed secrets, then calls another function to resolve the Badminton Belgium organisation id from `GET /organizations`. From that point onward, every subsequent client function automatically attaches the bearer token and the `organization-ids[]` query parameter on the engineer's behalf.

**Why this priority**: every other endpoint is gated by these two calls. Without working auth + org resolution, no later function can be exercised, tested, or trusted. This is the smallest end-to-end slice that proves the client architecture works.

**Independent Test**: with valid credentials in env, calling `authenticate()` returns a usable token and `getOrganizations()` returns at least one organisation including `{ id: 34245, name: "Badminton Belgium" }`. With invalid credentials, `authenticate()` rejects with a typed authentication error. The function does not write anything to the Badman database.

**Acceptance Scenarios**:

1. **Given** valid Twizzit credentials in env, **When** `authenticate()` is called, **Then** the function returns a bearer token validated against the expected response shape (zod-checked) and no exception is thrown.
2. **Given** a valid bearer token, **When** `getOrganizations()` is called, **Then** the function returns a list of `{ id: number, name: string }` (zod-checked), including the federation organisation.
3. **Given** invalid credentials, **When** `authenticate()` is called, **Then** the function throws a typed `TwizzitAuthError` carrying the HTTP status and a redacted message; no credential value appears in the error or in any log line.
4. **Given** the federation rotates the API key, **When** the engineer updates the env secret and re-runs `authenticate()`, **Then** no code change is required and the function succeeds with the new credentials.

---

### User Story 2 - Fetch and validate each Twizzit resource we depend on (Priority: P1)

A backend engineer calls a typed function per Twizzit resource that the integration depends on (`contacts`, `memberships`, `membershipTypes`, `extra-fields`, `organizations`) and receives a fully-validated, strongly-typed result. The shape of every response is guaranteed at runtime by zod schemas derived from the documented response samples; anything outside the schema surfaces as a structured validation error rather than a silent type drift.

**Why this priority**: the entire later sync pipeline assumes the API returns the shapes documented in `api-exploration.md`. Until each endpoint is exercised against the live API and validated, those assumptions are unverified. This story is the validation pass that closes documentation gap **G1** (Swagger never copied) and partially closes the open questions in the gaps doc (pagination shape, soft-delete representation, stable-id assumptions, club endpoint existence).

**Independent Test**: each endpoint function can be called against staging Twizzit; the function either returns a zod-validated typed result or throws a structured error. A recorded-fixture test suite exercises the same functions offline and produces identical typed outputs. Nothing is persisted.

**Acceptance Scenarios**:

1. **Given** a valid bearer token and resolved org id, **When** `getContacts({ … })` is called, **Then** the response is parsed against the contact schema and returned as a typed array; any field not present in the schema is either accepted (passthrough) or rejected (strict mode) per the chosen validation policy (see Assumptions).
2. **Given** the same conditions, **When** `getMemberships({ … })` is called, **Then** the response is parsed and returned with `id`, `contact-id`, `membership-type-id`, `club-id`, `start-date`, `end-date` typed and validated.
3. **Given** the same conditions, **When** `getMembershipTypes()` is called, **Then** the response is parsed and returned with the localised `name` object (EN/NL/FR), `type`, optional `duration`/`duration-unit`/`end-date`/`transfer-date`.
4. **Given** the same conditions, **When** `getExtraFields()` is called, **Then** the response is parsed and returned with `id`, localised `name`, `type`, `location`, `options`, and `attributes`.
5. **Given** the live API returns a payload that does not conform to the documented schema (e.g. a new field, a renamed key, a null where a string is expected), **When** any endpoint function is called, **Then** the function throws a typed `TwizzitValidationError` that names the endpoint, the failing path, and the actual vs expected value — and the run does not silently truncate or coerce.
6. **Given** the live API uses offset-based pagination (`limit` + `offset` query parameters), **When** a list endpoint function is called, **Then** the function transparently loops over pages until exhausted and returns the full validated list; the optional `{ pageSize, maxPages }` argument allows the caller to bound a pull, and the `maxPages` default prevents unbounded loops.

---

### User Story 3 - Structured, redacting error handling (Priority: P1)

When any client function fails, the engineer receives a discriminated-union error that distinguishes auth failures, validation failures, network failures, HTTP errors with category (4xx vs 5xx), and rate-limit `429`s. The error carries enough context to diagnose without leaking the bearer token, the password, or any PII fetched on the way to the failure.

**Why this priority**: the requirements doc (`F6.3`, `N1.1`, `N4.1`) requires per-record error containment, graceful `429` handling, and zero credential leakage in logs. Without a typed error taxonomy in place at the client layer, every later layer reinvents it.

**Independent Test**: deliberately induce each failure class (invalid creds, expired token, network drop, malformed payload, simulated `429` with `Retry-After`) against a mocked Twizzit and confirm each produces the documented error variant with the documented fields. A grep over test output confirms no credential or token value ever appears in serialised error messages.

**Acceptance Scenarios**:

1. **Given** the API returns `401` mid-session, **When** any endpoint function is called, **Then** the client transparently re-authenticates once and retries; if the retry also fails, a typed `TwizzitAuthError` is thrown (per requirement F1.4).
2. **Given** the API returns `429 Too Many Requests` with a `Retry-After` header, **When** any endpoint function is called, **Then** the client honours the header and back-off + retry behaviour is bounded by an explicit max-retry policy; on final failure a typed `TwizzitRateLimitError` is thrown carrying `retryAfterMs`.
3. **Given** a transient network error (`ECONNRESET`, DNS, timeout), **When** any endpoint function is called, **Then** the client throws a typed `TwizzitNetworkError` (no swallowed exception, no fake success).
4. **Given** the API returns 5xx, **When** any endpoint function is called, **Then** the client throws a typed `TwizzitServerError` carrying the status and a sanitised body excerpt.
5. **Given** any error is logged or serialised, **When** the message is rendered, **Then** the bearer token, password, and the entire `Authorization` header value never appear in plaintext. Verified by a dedicated test.

---

### User Story 4 - Recorded fixtures replace the live API in CI (Priority: P2)

The test suite runs hermetically in CI without hitting the live Twizzit API. Recorded JSON fixtures captured from staging exercise the same parser and error paths, so every PR exercises the full client surface deterministically. A separate opt-in integration mode (`RUN_TWIZZIT_LIVE_TESTS=1` or similar) can be run on demand to confirm the recorded fixtures still match staging.

**Why this priority**: requirement N1.1 ("respect rate limits") and developer ergonomics rule out hitting live Twizzit from CI. Without recorded fixtures the test suite is either useless (no live access) or noisy and slow.

**Independent Test**: `nx test` for the new lib runs offline with `RUN_TWIZZIT_LIVE_TESTS` unset and passes. Setting the env variable runs the same describe blocks against staging and is expected to pass against the current tenant; failures here indicate Twizzit drift and a fixture refresh is required.

**Acceptance Scenarios**:

1. **Given** the fixtures are checked into the repo, **When** the test suite is run with `RUN_TWIZZIT_LIVE_TESTS` unset, **Then** every endpoint function is exercised against fixtures and no network call is made.
2. **Given** the live API and the fixture diverge, **When** the live-mode test suite is run, **Then** the suite fails with a clear diff pointing at the field that drifted, so the engineer can refresh the fixture intentionally.
3. **Given** a developer adds a new endpoint function, **When** they record a fixture from staging once, **Then** the offline test exercises the parser without additional credentials or network setup.

---

### Edge Cases

- A `contact.extra-field-values` entry references an `extraField.id` that is not in `/extra-fields` (race between two snapshots) → return as-is, surface as a soft warning in the typed result; do not throw.
- A field documented as a string is returned as `null` or `""` (e.g. `end-date: ""` already observed) → the schema explicitly accepts the empty-string convention and normalises to `null` in the typed output.
- A `Member ID` extra-field-value is missing for a contact → the contact still parses; downstream layers decide whether that is a hard error (not this layer's concern).
- The federation rotates credentials mid-run → the bounded re-auth retry handles it transparently; a second failure surfaces as `TwizzitAuthError`.
- Twizzit ships the promised `last-modified` filter mid-build → the client must expose the filter as an optional query argument from day one (even if unset), so adopting it later is a no-op for the contract.
- The federation soft-deletes a record (gap Q5) → if Twizzit signals soft-delete via a new field, the strict schema fails loudly on the next run, prompting a deliberate fixture refresh + schema bump rather than a silent drop. If Twizzit signals it by omitting the record from the list, the client returns `[]` for that record and downstream layers reconcile.
- Twizzit returns an empty list vs a 404 for a resource → both are valid "no records" outcomes; the client returns `[]` in both cases without throwing.

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 0 (prerequisites)

- **FR-001**: A dedicated Twizzit API key for Badman MUST exist, stored in 1Password and surfaced to the worker via environment variables only.
- **FR-002**: The staging Twizzit tenant and credentials MUST be confirmed safe to call from automated tests at the cadence implied by the test suite.
- **FR-003**: The status of the Twizzit `last-modified` filter (per open question Q1) MUST be confirmed before Phase 1 design freezes. The client design MUST NOT be blocked on it, but the recorded answer MUST be filed in the docs folder.
- **FR-004**: Rate-limit headroom for staging and the expected production headroom MUST be documented; the client's retry policy MUST be tuned to those numbers.

#### Phase 1 (design)

- **FR-005**: An ADR (or design doc under `docs/twizzit/`) MUST capture: (a) where the Twizzit-specific code lives in the monorepo, (b) the federation-agnostic gateway (interface, not implementation), (c) the validation strategy (strict vs passthrough zod), (d) the pagination strategy per endpoint, (e) the error taxonomy.
- **FR-006**: The client library MUST live as its own buildable Nx lib at `libs/integrations/twizzit-client` (import path `@badman/integrations-twizzit-client` or equivalent), so it can be consumed by `apps/worker/sync` and any future federation worker without dragging unrelated code (per N3.1). The library MUST be a plain TypeScript module — no NestJS decorators, modules, or providers inside it. A separate NestJS adapter MAY be added in a later phase under `apps/worker/sync` (or a thin sibling lib) when the consumer is wired up; that adapter is out of scope here.
- **FR-007**: The client MUST NOT import Sequelize models, GraphQL resolvers, or Bull queues. Its only inputs are configuration + credentials; its only outputs are validated typed values. Database persistence is a downstream concern.
- **FR-008**: The boundary between "talk to Twizzit" and "reconcile to Badman" MUST be expressible as a TypeScript interface (`FederationGateway`, in `src/gateway.ts`) in this lib, so a non-Twizzit federation can later supply an alternative implementation (per N3.1, gap Q21). The interface MUST type its method returns with the federation-agnostic generic entity types (`FederationContact[]`, `FederationMembership[]`, etc., defined in `src/federation.ts`) — NOT with Twizzit-specific raw types, and NOT with `unknown[]`. The generic types use camelCase fields, lowercase locale keys (`en/nl/fr`), and explicit nullability for fields that come over the wire as empty strings.

#### Phase 2 (client surface)

- **FR-009**: The client MUST expose one typed function per endpoint currently exercised by Badman: `authenticate`, `getOrganizations`, `getContacts`, `getMemberships`, `getMembershipTypes`, `getExtraFields`. Additional endpoints discovered in the Swagger (documentation gap G1) MUST be added the same way once needed.
- **FR-010**: Every response shape MUST be defined as a zod schema in the same lib. Each schema MUST `.transform()` Twizzit's raw kebab-case wire format into a federation-agnostic camelCase shape (see FR-008 / `src/federation.ts`). The TypeScript types consumed by callers MUST be the generic `Federation*` shapes — NOT inferred raw types. Twizzit's wire format is an internal implementation detail of the schemas; the lib's public surface never exposes kebab-case keys or uppercase locale keys (`EN/NL/FR`). *(2026-05-13: previously the schemas' `z.infer` Twizzit-specific shapes were the public types — replaced by generic types per user direction.)*
- **FR-011**: Schema definitions MUST be derived from the actual responses documented in `docs/twizzit/api-exploration.md`, validated against the live staging API at least once during Phase 2, and revised if any drift is found. Each drift MUST be recorded as a fixture refresh + ADR amendment, not silently fixed.
- **FR-012**: Each function MUST automatically attach `Authorization: Bearer <token>` and `organization-ids[]=<orgId>` to every request after `authenticate` + `getOrganizations` have run; callers MUST NOT need to thread these through manually.
- **FR-013**: On a `401` response mid-session, the client MUST re-authenticate once and retry the failing request; a second `401` MUST throw a typed auth error (per F1.4). Implementation hint: an axios response interceptor is the natural place — see [research.md](research.md) R1.
- **FR-014**: On a `429` response, the client MUST honour `Retry-After` and apply bounded exponential back-off; on exhaustion the client MUST throw a typed rate-limit error carrying `retryAfterMs` and the attempt count (per N1.1). Implementation hint: `axios-retry` or an axios response interceptor satisfies this without per-endpoint plumbing.
- **FR-015**: All client errors MUST be a discriminated union over: `TwizzitAuthError`, `TwizzitValidationError`, `TwizzitNetworkError`, `TwizzitRateLimitError`, `TwizzitServerError`, `TwizzitClientError` (4xx other than 401/429). Error class shape and field list are part of the public contract.
- **FR-016**: Error messages constructed by the lib MUST NOT include the password, the bearer token, or the full `Authorization` header value as **string-interpolated content**. (Example: an auth-failure message should say "Authentication failed (HTTP 401)", never "Authentication failed with password=hunter2".) The lib does NOT implement a deep-redaction pipeline or run secrets through a scrub utility — consumers handle structured-logging redaction at the platform level. *(2026-05-13: previously this requirement mandated a full `redact()` pipeline + grep gate; that was over-engineering and was removed. The construction-time discipline above is the surviving guarantee.)*
- **FR-017**: Every client function MUST have unit tests using a mocked HTTP layer (axios-mock-adapter bound to the client's internal HTTP instance, OR an axios interceptor stub) that cover: happy-path parsing, schema failure, 401-then-success retry, 401-then-401 final failure, 429 honour-retry-after, 5xx surfacing, network error surfacing.
- **FR-018**: Every client function MUST have a recorded-fixture test that exercises the real parser end-to-end against a JSON file captured from staging.
- **FR-019**: A live-mode test suite MUST exist, gated behind `RUN_TWIZZIT_LIVE_TESTS=1` (or equivalent, decided in Phase 1), that exercises the same functions against staging Twizzit. CI MUST NOT enable live mode by default.
- **FR-020**: The client MUST NOT write to the Badman database. It MUST NOT import `@badman/backend-database`, `@badman/backend-queue`, `@badman/backend-graphql`, or any other module that performs persistence. (This is the hard scope boundary for this spec.)
- **FR-021**: For list endpoints, pagination MUST be transparent: each list function loops Twizzit's offset-based pagination (`limit` + `offset` query parameters) internally and returns the full validated list to the caller. Each list function MUST accept an optional `{ pageSize?: number; maxPages?: number }` argument so callers can bound a pull when needed; `maxPages` MUST default to a documented finite value (no infinite loops). Multi-page behaviour MUST be exercised by a recorded-fixture test that captures at least two pages of response.
- **FR-022**: The bearer token MUST be cached in memory on the `TwizzitClient` instance and MUST NOT be persisted to disk, Redis, or any shared store (per N4.1). The client MUST compute token lifetime from the `created-on` and `valid-till` fields returned in the `/authenticate` response body (both unix-seconds) and refresh the token proactively once ≥80 % of the lifetime has elapsed. The JWT itself MUST be treated as opaque — its `exp` claim is not parsed because the response body's `valid-till` is shorter and therefore binding. If `valid-till` is absent on a future response, the client MUST fall back to the reactive `401`-retry path (FR-013) and the strict-zod schema MUST surface the missing field as a `TwizzitValidationError`. Token refresh failures MUST surface as `TwizzitAuthError` (FR-015).

### Key Entities

- **TwizzitClient configuration**: Inputs needed to construct the client — base URL, credentials reference, organisation id (resolved lazily on first call), retry policy, validation policy, and an optional `logger` matching a minimal interface `{ debug, info, warn, error: (msg: string, meta?: Record<string, unknown>) => void }`. The client MUST NOT depend on a concrete logger (Pino, winston, Nest `Logger`); the default is a no-op logger. No business identity attached.
- **TwizzitClient session**: Runtime state — current bearer token, token expiry hint, resolved organisation id, in-flight retry counters. Internal; not part of the public surface.
- **Organization (Twizzit)**: `{ id: number, name: string }`. The Badminton Belgium record has `id: 34245`. Used only as an input parameter on every other call; not persisted by this layer.
- **Contact (Twizzit)**: The personal-data side of a member — name, date-of-birth, gender, nationality, language, addresses, emails, mobiles, plus an `extra-field-values` array. The federation member id is inside `extra-field-values` under the `"Member ID"` extra field, not on the top-level contact. **Not** mapped to Badman `Player` in this spec.
- **Membership (Twizzit)**: The link between a contact and a club, scoped to a membership type. Fields: `id`, `contact-id`, `membership-type-id`, `club-id`, `start-date`, `end-date`, optional `extra-field-values`. Loans are modelled as a separate membership of type "Loan player". **Not** mapped to Badman `ClubPlayerMembership` in this spec.
- **MembershipType (Twizzit)**: The catalogue of membership categories defined by the federation. Observed types: Competitive member, Recreative member, Youth, Loan player, Non-player, Trial membership (21 days), Unbound summer player. Treated as slowly-changing reference data. **Not** mapped to a Badman membership-type representation in this spec.
- **ExtraField (Twizzit)**: Custom-field schema with `id`, localised `name`, `type` (Text/Date/Single/Multiple/Checkbox), `location`, `options`, `attributes`.
- **TwizzitError (variant)**: Discriminated union — see FR-015. Each variant is itself an entity with its own typed fields (endpoint, attempt count, validation path, status, sanitised excerpt).
- **Recorded fixture**: A JSON file checked into the repo capturing a real Twizzit response, used by offline tests. One per endpoint at minimum; multiple for paginated cases.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A second developer can call every documented Twizzit endpoint from a Node script in under 5 minutes after cloning the repo and setting two environment variables — without writing any HTTP, header, or pagination code themselves.
- **SC-002**: 100% of the endpoints exercised in `docs/twizzit/api-exploration.md` are covered by a typed client function with a zod schema and an offline fixture test.
- **SC-003**: Every documented error class (auth, validation, network, rate-limit, 5xx, 4xx-other) has at least one regression test that asserts the typed error variant is returned with the expected fields.
- **SC-004**: Spot review of the auth-failure path confirms no string-interpolation of the password or token into error messages constructed by the lib. (Note: 2026-05-13 — the previously-mandated automated grep-gate test was removed along with the `redact()` pipeline.)
- **SC-005**: Running the offline test suite for the new client lib completes in under 10 seconds locally and in CI; running the opt-in live-mode suite against staging completes within the documented rate-limit headroom (FR-004).
- **SC-006**: Adding a new Twizzit endpoint follows a published recipe: define the zod schema → add the function calling the shared HTTP layer → record one fixture from staging → add the parser + error tests. Recipe documented in the lib's README; verified by a second developer adding one such endpoint as a smoke test of the recipe.
- **SC-007**: Open questions Q2 (pagination), Q5 (soft-delete representation), Q6 (clubs endpoint existence), and Q8 (stable id immutability) from `docs/twizzit/gaps-and-open-questions.md` have explicit answers in the Phase 1 ADR — derived from live calls plus a Swagger inspection. If any answer cannot be obtained without Twizzit support, that fact is recorded and the client design accommodates the unknown rather than guessing.
- **SC-008**: No code under the new client lib's directory imports `@badman/backend-database`, `@badman/backend-queue`, `@badman/backend-graphql`, or any Sequelize model. Enforced by a unit test that fails on offending imports.

## Assumptions

- The client lib is the **only** delivery item for this spec. No Sequelize model change, no migration, no resolver, no cron job, no consumer in `apps/worker/sync` is implemented as part of this spec — those land in later phases.
- The Twizzit API base URL is the production API hosted by Twizzit (`https://app.twizzit.com/...`) — confirmed by the Swagger link in the API reference index. A staging URL may exist but is not assumed; the same base URL is used with the staging key per requirement F1.3 / N4.1.
- The validation policy is **strict everywhere** — every schema uses zod's strict mode and rejects unknown keys with a `TwizzitValidationError`. There is no `.passthrough()` escape hatch, including for `extra-field-values`. When Twizzit adds a field (e.g. the soft-delete flag from gap Q5, or a new extra-field shape) the next live run fails loudly; the workflow is: capture the new fixture → bump the schema → ship a deliberate change. This trades a brittle-on-drift posture for zero silent type regressions.
- The lib uses zod for schemas (decided here because the user explicitly named zod). The HTTP client is **axios** (decided 2026-05-13; supersedes the previous "deferred to Phase 1 ADR / decided as `fetch`" choice). The lib uses axios's interceptors for header injection + retry; axios is NOT re-exported through the public surface.
- Recorded fixtures are stored under the new lib's `__fixtures__/` (or equivalent) directory and contain no real PII beyond what is already public on `app.twizzit.com` for test accounts. If staging data is not safe to commit, fixtures are anonymised before check-in. The anonymisation policy is recorded in the lib's README.
- The federation-agnostic gateway (FR-008) is shaped as an interface in the same lib for now and may move to a higher-level shared lib in a future phase when a second federation actually appears. This avoids speculative abstraction (per CLAUDE.md guidance: three similar lines beats a premature abstraction).
- Translation strings, GraphQL types, and Badman membership-type representations are out of scope and explicitly deferred to later phases.
- The cron job that will later invoke this client lives in `system.CronJobs`; it is not configured or modified in this spec.

## Dependencies

- Valid Twizzit credentials for Badminton Belgium, in 1Password and reachable to the worker process via environment variables.
- Access to staging Twizzit data sufficient to record fixtures for every endpoint covered by FR-009.
- Phase 1 ADR sign-off (gap-doc decisions D2 and D4 are explicitly out of scope here — only the client-shape decisions that don't depend on them are pinned).
- Resolution of, or explicit deferral of, open questions Q1, Q2, Q5, Q6, Q8 from `docs/twizzit/gaps-and-open-questions.md` (the rest unblock later phases, not this one).
