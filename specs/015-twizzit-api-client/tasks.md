---

description: "Task list for Twizzit API Client (Phases 0–2 Foundation)"

---

# Tasks: Twizzit API Client (Phases 0–2 Foundation)

**Input**: Design documents from `/specs/015-twizzit-api-client/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED for this feature (FR-017, FR-018, FR-019, SC-002, SC-003). Every endpoint function gets unit + fixture tests; an opt-in live-mode suite mirrors them. *(2026-05-13: SC-004's grep-gate test was removed when the `redact()` pipeline was retired — see research.md R12.)*

**Organization**: Tasks grouped by user story. Three of the four stories are P1 (US1, US2, US3) and are tightly interleaved — the structured-error story (US3) is exercised inside the tests of US1 and US2, so US3-specific tasks focus on coverage gaps not already hit. US4 (P2) is the CI ergonomics polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 — maps to user stories in spec.md
- File paths are absolute under the repo root `/Users/arno/Documents/Projects/Badman/badman/`

## Path Conventions

The lib lives at `libs/integrations/twizzit-client/` (per plan.md Structure Decision):

- Source: `libs/integrations/twizzit-client/src/`
- Tests: `libs/integrations/twizzit-client/test/`
- Fixtures: `libs/integrations/twizzit-client/test/__fixtures__/`

---

## Phase 0: Coordination Prerequisites (parallel to dev, not blocking lib build)

**Purpose**: Out-of-code prerequisites from spec.md FR-001..FR-004 and gap-doc questions tied to SC-007. These are tracked here so they are visible and assignable; they do NOT block any T0xx code task — the lib design (research.md R10) already accommodates each unknown.

- [ ] T001 [P] Confirm with Badminton Vlaanderen that a dedicated Badman Twizzit API key exists in 1Password, separate from any human-test key (FR-001). Record the 1Password item reference in `docs/twizzit/credentials.md` (new file, do not commit secrets).
- [ ] T002 [P] Confirm staging Twizzit tenant data is safe to call from automated tests (FR-002). Document outcome in `docs/twizzit/credentials.md`.
- [ ] T003 [P] Email Philippe / PandaPanda asking gap-doc Q1 (`last-modified` filter status & shape), Q2 (page-size cap), Q3 (rate-limit numbers for staging + production), Q5 (soft-delete representation), Q6 (clubs endpoint existence). File replies as appendices to `docs/twizzit/api-exploration.md`.
- [ ] T004 [P] Once Q3 returns, re-tune `TwizzitClientRetryPolicy` defaults in `libs/integrations/twizzit-client/src/client.ts` (currently 3 retries / 120 s budget per research.md R3); update [research.md](research.md) R3 in the same PR.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the buildable Nx lib at `libs/integrations/twizzit-client`.

- [ ] T005 Generate the Nx lib: run `npx nx g @nx/js:library twizzit-client --directory=libs/integrations --unitTestRunner=jest --bundler=none --linter=eslint --importPath=@badman/integrations-twizzit-client` from the repo root. Verify `libs/integrations/twizzit-client/{project.json,tsconfig.lib.json,tsconfig.spec.json,jest.config.ts}` exist.
- [ ] T006 Add `zod` AND `axios` (plus optional `axios-retry` for 429 back-off) as direct dependencies: `npm install zod axios axios-retry` at the repo root (Nx hoists). Confirm `package.json` records all three under `dependencies`. *(2026-05-13: axios added per research.md R1; was previously Node global `fetch`.)*
- [ ] T007 [P] Delete the generator's placeholder `libs/integrations/twizzit-client/src/lib/twizzit-client.ts` and its co-located spec; replace `libs/integrations/twizzit-client/src/index.ts` with an empty barrel that will accumulate public exports.
- [ ] T008 [P] Confirm `nx test integrations-twizzit-client` (or equivalent project name printed by the generator) runs an empty green suite. Then add `eslint`-disallowed-imports rule to `libs/integrations/twizzit-client/.eslintrc.json` banning `@badman/backend-database`, `@badman/backend-graphql`, `@badman/backend-queue`, and `sequelize` (per FR-007, FR-020, SC-008).

**Checkpoint**: Lib scaffold builds and tests green. Public surface area empty.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting infrastructure every user story depends on: logger, error classes, axios HTTP wrapper, pagination helper, federation gateway, import-boundary guard, shared schemas.

**⚠️ CRITICAL**: All US1/US2/US3/US4 tasks depend on this phase completing.

- [ ] T009 [P] Create the `Logger` interface and `noopLogger` constant at `libs/integrations/twizzit-client/src/logger.ts`. Match the shape declared in [contracts/client.ts](contracts/client.ts) (`debug/info/warn/error: (msg: string, meta?: Record<string, unknown>) => void`).
- [ ] T010 ~~Create the secret-redaction utility at `src/redact.ts`~~ **— REMOVED 2026-05-13** per research.md R12. The deep-redaction pipeline was over-engineering. What replaces it: construction-time discipline in `src/errors.ts` (no string-interpolation of password/token into error `message` fields) and a single `truncate(body, maxLen)` helper (no secret-scrub) used by `bodyExcerpt`-carrying errors. No dedicated `redact.spec.ts` is shipped.
- [ ] T011 [P] Create all six error classes at `libs/integrations/twizzit-client/src/errors.ts` matching [contracts/errors.ts](contracts/errors.ts) exactly: `TwizzitAuthError`, `TwizzitValidationError`, `TwizzitNetworkError`, `TwizzitRateLimitError`, `TwizzitServerError`, `TwizzitClientError`. Each extends `Error`, has the `kind` discriminant as a readonly literal. Constructors MUST NOT string-interpolate password or bearer token into the `message` field (e.g. say `"Authentication failed (HTTP 401)"`, never `\`Auth failed with password=${password}\``). `bodyExcerpt` is a plain `truncate(body, 200)` — not secret-scrubbed. Export `isTwizzitError(e: unknown): e is TwizzitError` type-guard.
- [ ] T012 [P] Create shared zod schemas at `libs/integrations/twizzit-client/src/schemas/shared.ts`: `LocalisedNameSchema` (`{ EN, NL, FR }` all required strings, `.strict()`), `EmailSchema`, `MobileSchema`, `PhoneSchema`, `AddressSchema` per data-model.md. Apply the empty-string-to-null transform only on `target` / `cc`; preserve `""` on `number` and `email`.
- [ ] T013 Create the axios HTTP setup at `libs/integrations/twizzit-client/src/http.ts`: exported `createTwizzitAxios(config: { baseUrl, getToken: () => string | undefined, getOrganizationId: () => number | undefined, retryPolicy, logger, onUnauthorized: () => Promise<void> }): AxiosInstance`. Configures: `baseURL`, `paramsSerializer` producing kebab-bracket arrays (`organization-ids[]=34245`), a **request interceptor** that adds `Authorization: Bearer <token>` (from `getToken()`) and merges the org-ids param when present, a **response interceptor** that classifies errors into `TwizzitError` variants by `axios.isAxiosError(err) && err.response?.status` (401 → call `onUnauthorized()` and retry once via `error.config` flag; 429 → honour `Retry-After` and back off via `axios-retry` config or manual loop; 5xx → `TwizzitServerError`; 4xx-other → `TwizzitClientError`; network → `TwizzitNetworkError`). The `AxiosInstance` is returned to the caller; consumers of the lib never see it. (Depends on T009, T011. Note: T010 no longer applies — no `redactSecrets` arg.)
- [ ] T014 [P] Create the pagination helper at `libs/integrations/twizzit-client/src/pagination.ts`: `paginate<T>(opts: { fetchPage: (offset: number, limit: number) => Promise<T[]>, pageSize?: number, maxPages?: number, endpointLabel: string }): Promise<T[]>`. Defaults: `pageSize=100`, `maxPages=2000`. Throws `TwizzitClientError` with `subkind: "max-pages-exceeded"` when the cap is reached. Plus `libs/integrations/twizzit-client/test/pagination.spec.ts` covering: single page, multi-page loop, terminates when the fetched page is shorter than `pageSize`, `maxPages` overflow throws, custom `pageSize` is forwarded.
- [ ] T015 [P] Create the federation gateway at `libs/integrations/twizzit-client/src/gateway.ts`: TypeScript interface `FederationGateway` (concrete return types: `Organization[]`, `Contact[]`, `Membership[]`, `MembershipType[]`, `ExtraField[]`), plus `PaginationBounds`, `ContactsQuery`, `MembershipsQuery`. See research.md R9 and [contracts/client.ts](contracts/client.ts). No implementation in this file — just the types. *(2026-05-13: renamed from `seam.ts` / `FederationContactSource` to `gateway.ts` / `FederationGateway`; concrete return types replace earlier `unknown[]`.)*
- [ ] T016 [P] Add the import-boundary test at `libs/integrations/twizzit-client/test/no-forbidden-imports.spec.ts` (SC-008). Walk every `.ts` file under `src/`, regex-grep for `from\s+['"]@badman/backend-(database|graphql|queue)['"]`, `from\s+['"]sequelize`, `from\s+['"]@nestjs/`, `from\s+['"]bull['"]`. Fail with a clear message naming the offending file + line.

**Checkpoint**: Foundation green. Every user story below can start in parallel.

---

## Phase 3: User Story 1 — Authenticate & resolve organisation id (Priority: P1) 🎯 MVP

**Goal**: Calling `new TwizzitClient({...}).authenticate()` followed by `.getOrganizations()` returns a validated organisation list, with invalid creds throwing `TwizzitAuthError`. Auto-refresh at 80 % of `valid-till` lifetime; reactive 401-retry as fallback.

**Independent Test**: With valid creds in env and Phases 1–2 done, a Node one-liner that `await client.authenticate(); console.log(await client.getOrganizations())` prints `[{ id: 34245, name: "Badminton Belgium" }]`. With invalid creds, the script exits with a `TwizzitAuthError` whose message contains no credential value.

### Tests for User Story 1 (write first; ensure they fail before the implementation tasks below them complete)

- [ ] T017 [P] [US1] Add fixture `libs/integrations/twizzit-client/test/__fixtures__/authenticate.200.json` based on the live response captured 2026-05-12 (token replaced with a clearly-synthetic placeholder, `created-on`/`valid-till` kept verbatim).
- [ ] T018 [P] [US1] Add fixture `libs/integrations/twizzit-client/test/__fixtures__/organizations.200.json` containing `[{ "id": 34245, "name": "Badminton Belgium" }]`.
- [ ] T019 [US1] Create `libs/integrations/twizzit-client/test/client.auth.spec.ts` with describe blocks for: (a) authenticate happy path returns void and caches token; (b) authenticate 401 → `TwizzitAuthError`; (c) authenticate network error → `TwizzitNetworkError`; (d) authenticate response missing `valid-till` → `TwizzitValidationError`; ~~(e) credential redaction~~ **— REMOVED 2026-05-13** along with the redact pipeline; (f) getOrganizations happy path returns the parsed array; (g) getOrganizations called before authenticate → either auto-authenticates (preferred) or throws `TwizzitClientError` with `subkind: "missing-organization-id"`. Mock HTTP via `axios-mock-adapter` (preferred — bind it to the lib's internal axios instance, which the lib MUST expose to tests via a testability seam such as a `client.[Symbol.for('twizzit/http')]` private property or an optional `axiosInstance?` config override) OR wrap and inject an alternate `AxiosInstance` through config. Either way: do NOT monkey-patch global axios. (Depends on T013, T011, T012.)
- [ ] T020 [US1] Extend `client.auth.spec.ts` with token-refresh coverage: (a) proactive refresh — simulate `valid-till = now + 100s`, advance fake timers to `t = 81 s`, call `getOrganizations`, assert a second `authenticate` HTTP call was made before the GET; (b) reactive 401-retry — first GET responds 401, second `authenticate` succeeds, retried GET succeeds; (c) double 401 — first 401, re-auth succeeds, retried GET also 401 → `TwizzitAuthError`. Use `jest.useFakeTimers()` and inject a mock clock if needed.

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create the authenticate response schema at `libs/integrations/twizzit-client/src/schemas/authenticate.ts`: `AuthenticateResponseSchema = z.object({ token: z.string().min(1), 'created-on': z.number().int().positive(), 'valid-till': z.number().int().positive() }).strict()` and export `type AuthenticateResponse = z.infer<typeof AuthenticateResponseSchema>`.
- [ ] T022 [P] [US1] Create the organization schema at `libs/integrations/twizzit-client/src/schemas/organization.ts`: `OrganizationSchema = z.object({ id: z.number().int().positive(), name: z.string().min(1) }).strict()`; export `Organization = z.infer<…>` and `OrganizationsResponseSchema = z.array(OrganizationSchema)`.
- [ ] T023 [US1] Create the authenticate endpoint at `libs/integrations/twizzit-client/src/endpoints/authenticate.ts`: `async function authenticate(axiosInstance, credentials, logger): Promise<AuthenticateResponse>`. POSTs to `/authenticate` (axios's baseURL handles the prefix) with JSON body `{ username, password }`, classifies 401/403 → `TwizzitAuthError` via the response interceptor in `src/http.ts`, parses response with `AuthenticateResponseSchema`. MUST NOT string-interpolate `password` or `username` into any thrown error's `message`. (Depends on T013, T021, T011.)
- [ ] T024 [US1] Create the organizations endpoint at `libs/integrations/twizzit-client/src/endpoints/organizations.ts`: `async function getOrganizations(http, token, logger): Promise<Organization[]>`. GETs `${baseUrl}/organizations` with `Authorization: Bearer ${token}`, parses with `OrganizationsResponseSchema`. (Depends on T013, T022.)
- [ ] T025 [US1] Create the `TwizzitClient` class skeleton at `libs/integrations/twizzit-client/src/client.ts`: constructor accepts `TwizzitClientConfig`, holds session state (`token`, `validTill`, `createdOn`, `organizationId`, `logger`). Implement `authenticate()` and `getOrganizations()` wiring T023 + T024 + the refresh policy from research.md R5: compute `refreshAt = createdOn + 0.8 * (validTill - createdOn)`; on every other method, check `Date.now() / 1000 >= refreshAt` and refresh first. Wrap the GET in a 401-retry-once helper (re-authenticate then retry the original request exactly once; second 401 throws `TwizzitAuthError`). Wire `organizationId` to lazy-resolve from `getOrganizations()` when caller didn't pass one. Export from `src/index.ts`. (Depends on T009, T011, T013, T023, T024.)
- [ ] T026 [US1] Add the live-mode auth test at `libs/integrations/twizzit-client/test/client.live.spec.ts` (new file). Wrap the whole file in `describe.skip` unless `process.env.RUN_TWIZZIT_LIVE_TESTS === '1'`. Tests: `authenticate()` resolves; `getOrganizations()` returns an array containing `{ id: 34245, name: 'Badminton Belgium' }`. Uses `process.env.TWIZZIT_USERNAME` and `TWIZZIT_PASSWORD` (skips with a warning if either is missing).

**Checkpoint**: US1 fully functional. A consumer can authenticate and list organizations.

---

## Phase 4: User Story 2 — Fetch and validate each Twizzit resource (Priority: P1)

**Goal**: `getContacts`, `getMemberships`, `getMembershipTypes`, `getExtraFields` each return a typed, validated array. List endpoints paginate transparently via `limit`/`offset` with `pageSize`/`maxPages` bounds (FR-021).

**Independent Test**: With Phases 1–3 done, calling each endpoint against the offline fixture suite returns a parsed array whose first element has the documented properties at the documented types. Synthetic mutated fixtures (e.g. `gender: 7`) cause `TwizzitValidationError` with a specific `path`.

### Tests for User Story 2

- [ ] T027 [P] [US2] Add fixtures: `libs/integrations/twizzit-client/test/__fixtures__/contacts.page-1.200.json` (≥ pageSize items so pagination loops), `contacts.page-2.200.json` (fewer-than-pageSize items so loop terminates), `memberships.page-1.200.json`, `membership-types.200.json`, `extra-fields.200.json`. Anonymise per research.md R8.
- [ ] T028 [P] [US2] Add fixture `libs/integrations/twizzit-client/test/__fixtures__/contacts.broken.json` — same as `contacts.page-1.200.json` but with one record's `gender` mutated to a non-allowed value, used to assert `TwizzitValidationError`.
- [ ] T029 [US2] Create `libs/integrations/twizzit-client/test/client.entities.spec.ts` with describe blocks for: (a) `getMembershipTypes()` returns the expected 7 BV types with localised names; (b) `getExtraFields()` returns at least one entry whose `name.EN === "Member ID"`; (c) `getContacts()` happy path; (d) `getContacts()` with mutated fixture throws `TwizzitValidationError` whose `path` mentions `gender`; (e) `getContacts()` two-page sequence stitches into one array; (f) `getMemberships()` happy path including a Loan-type row; (g) `getMemberId(contacts[0])` returns the embedded "Member ID" value or null. Mocked HTTP layer routes URLs to fixtures.
- [ ] T030 [US2] Extend `client.entities.spec.ts` with pagination edge cases: (a) `pageSize: 50` forwards as `limit=50&offset=0,50,100…`; (b) `maxPages: 1` overflow throws `TwizzitClientError` with `subkind: "max-pages-exceeded"`; (c) `lastModified: new Date('…')` is forwarded as a query param (placeholder for Q1 — the test asserts the param is included so the contract is locked even if the server-side filter doesn't exist yet).

### Implementation for User Story 2

- [ ] T031 [P] [US2] Create `libs/integrations/twizzit-client/src/schemas/contact.ts`: `ExtraFieldValueSchema` (extraField + value sub-objects, all strict), `ContactSchema` per data-model.md (`.strict()`, empty-string normalisations on `end-date`/`date-of-birth`/identifiers), `ContactsResponseSchema = z.array(ContactSchema)`. Export inferred types. Also export `getMemberId(contact: Contact): string | null` (locates `extra-field-values` entry whose `extraField.name.EN === "Member ID"`).
- [ ] T032 [P] [US2] Create `libs/integrations/twizzit-client/src/schemas/membership.ts`: `MembershipSchema` per data-model.md (`.strict()`, `end-date: ""` → `null`), `MembershipsResponseSchema = z.array(MembershipSchema)`, export types.
- [ ] T033 [P] [US2] Create `libs/integrations/twizzit-client/src/schemas/membership-type.ts`: `MembershipTypeSchema` per data-model.md (`type` enum of 4 known values; will fail loudly on a new one), `MembershipTypesResponseSchema`, export types.
- [ ] T034 [P] [US2] Create `libs/integrations/twizzit-client/src/schemas/extra-field.ts`: `ExtraFieldSchema` per data-model.md (`type` enum, `location` enum incl `""` and `null`), `ExtraFieldsResponseSchema`, export types.
- [ ] T035 [P] [US2] Create `libs/integrations/twizzit-client/src/endpoints/contacts.ts`: `async function getContacts(http, baseUrl, organizationId, token, opts: ContactsQuery, logger): Promise<Contact[]>`. Uses `paginate()` from T014; each page builds URL `${baseUrl}/contacts?organization-ids[]=${organizationId}&limit=${limit}&offset=${offset}${lastModified ? '&last-modified=' + lastModified.toISOString() : ''}`; parses each page through `ContactsResponseSchema`. (Depends on T013, T014, T031, T011.)
- [ ] T036 [P] [US2] Create `libs/integrations/twizzit-client/src/endpoints/memberships.ts` mirroring T035, with `clubId` optionally forwarded as `&club-id=${clubId}` when provided. Uses `MembershipsResponseSchema`.
- [ ] T037 [P] [US2] Create `libs/integrations/twizzit-client/src/endpoints/membership-types.ts`: single-page GET `${baseUrl}/membershipTypes?organization-ids[]=${organizationId}`; parses with `MembershipTypesResponseSchema`.
- [ ] T038 [P] [US2] Create `libs/integrations/twizzit-client/src/endpoints/extra-fields.ts`: single-page GET `${baseUrl}/extra-fields?organization-ids[]=${organizationId}`; parses with `ExtraFieldsResponseSchema`.
- [ ] T039 [US2] Wire the four methods into `TwizzitClient` at `libs/integrations/twizzit-client/src/client.ts`: `getContacts`, `getMemberships`, `getMembershipTypes`, `getExtraFields`. Each method: ensure auth (refresh if needed), ensure organizationId resolved (call `getOrganizations()` if `config.organizationId` is undefined and `this.organizationId` is unset — pick the first entry, log a `warn` if more than one). Implement the same 401-retry-once wrapper as on US1 methods. Add the four `fetchXxx` aliases that satisfy `FederationGateway`. (Depends on T025, T035, T036, T037, T038.)
- [ ] T040 [P] [US2] Update `libs/integrations/twizzit-client/src/index.ts` to export every schema, every inferred type, `getMemberId`, `FederationGateway`, all six error classes, `isTwizzitError`, `noopLogger`, `Logger`, `TwizzitClient`, and all config types.
- [ ] T041 [US2] Add live-mode entity tests to `libs/integrations/twizzit-client/test/client.live.spec.ts`: behind the same `RUN_TWIZZIT_LIVE_TESTS` gate, call each of the four list endpoints with `maxPages: 2` (so the test is bounded), assert each returns an array, log a sample for manual inspection. Treat any zod failure as a fatal test failure (signals real drift; closes documentation gap G1 over time).

**Checkpoint**: US2 fully functional. Every endpoint exposed in `docs/twizzit/api-exploration.md` is callable, validated, typed.

---

## Phase 5: User Story 3 — Structured error handling (Priority: P1)

**Goal**: All error variants are exercised, the discriminated union is the public contract, and construction-time discipline keeps credentials out of error message strings. *(2026-05-13: redaction-invariant grep gate removed — see research.md R12.)*

**Independent Test**: Each of the six `TwizzitError` variants can be deliberately induced in a unit test against an `axios-mock-adapter` mocked HTTP layer and asserted by `kind`. Spot-check of `src/errors.ts` and `src/endpoints/authenticate.ts` confirms no string-interpolation of password/token into error `message` strings.

### Tests for User Story 3

- [ ] T042 [P] [US3] Create `libs/integrations/twizzit-client/test/client.errors.spec.ts` with one describe-block per variant: (a) `TwizzitAuthError` — already covered in T019/T020 but add the case where `/organizations` returns 403 even with a fresh token; (b) `TwizzitValidationError` — synthetic mutated `organizations.broken.json` (one entry missing `name`) → assert `path` mentions index + `name`; (c) `TwizzitNetworkError` — configure `axios-mock-adapter` to `networkError()` → assert `code` field is populated; (d) `TwizzitRateLimitError` — first GET returns 429 with `Retry-After: 1`, second returns 429 with `Retry-After: 2`, third returns 429; with `maxRateLimitRetries: 2` assert throw on third with `retryAfterMs: 2000` and `attempts: 3`; (e) `TwizzitServerError` — 503 with body `<html>down</html>` → assert `bodyExcerpt` is truncated to ~200 chars (no secret-scrub assertion needed; see research.md R12); (f) `TwizzitClientError` — 422 with body `{"error":"bad limit"}` → assert `status: 422`, `subkind: undefined`; (g) `TwizzitClientError` subkind `max-pages-exceeded` — already in T030, reference it here for traceability.
- [ ] T043 ~~End-to-end redact grep gate~~ **— REMOVED 2026-05-13** per research.md R12. The previous T043 mandated a JSON.stringify-and-grep-for-`LEAK_ME` regression test; the underlying `redact()` pipeline was retired, so the test goes with it. The construction-time discipline in T011 (don't string-interpolate password/token into error `message` fields) is the surviving guarantee.
- [ ] T044 [P] [US3] Add `libs/integrations/twizzit-client/test/error-shape.spec.ts`: type-level test (via `expectTypeOf` from `expect-type` if already available, or a manual exhaustive switch) ensuring the `TwizzitError` union narrows correctly on `kind` — proves the discriminant works.

### Implementation for User Story 3

(No production-code tasks here — error classes (T011) and the per-status classification inside `http.ts` (T013) already shipped under foundational + US1/US2. US3 is realized through coverage.)

- [ ] T045 [US3] If the test work in T042/T044 exposes any error-field that string-interpolates a credential into `message`, fix it in `src/errors.ts` and `src/http.ts`. Document the fix as a follow-up bullet in [research.md](research.md). (Implementation task only if needed.)

**Checkpoint**: Every error variant has a regression test; the discriminated union is the documented public contract.

---

## Phase 6: User Story 4 — Recorded fixtures replace the live API in CI (Priority: P2)

**Goal**: The default `nx test` invocation makes zero network calls. `RUN_TWIZZIT_LIVE_TESTS=1 nx test` runs the same tests against staging.

**Independent Test**: Unset `RUN_TWIZZIT_LIVE_TESTS`, disconnect from the network, run `nx test integrations-twizzit-client` — every test passes. Then `RUN_TWIZZIT_LIVE_TESTS=1 nx test integrations-twizzit-client --testPathPattern .live.spec.ts` runs the live-only block.

- [ ] T046 [P] [US4] Audit every `*.spec.ts` (non-`.live`) in `libs/integrations/twizzit-client/test/` to confirm zero real network calls. Wire `axios-mock-adapter` in `libs/integrations/twizzit-client/test/setup.offline.ts` (loaded via `setupFilesAfterEach` in `jest.config.ts` when `RUN_TWIZZIT_LIVE_TESTS` is unset) so any axios call without a configured mock throws immediately with a clear message — and DEFENSIVELY also block `globalThis.fetch` the same way, in case future code falls back to it. *(2026-05-13: was previously fetch-only; expanded to also cover axios.)*
- [ ] T047 [P] [US4] Write the lib's `README.md` at `libs/integrations/twizzit-client/README.md` from [quickstart.md](quickstart.md). Include: TL;DR usage, config reference, endpoint cheatsheet, error pattern, testing modes (with concrete commands), the SC-006 "add a new endpoint" recipe, fixture-anonymisation policy, and the boundary note (no DB / no Nest / no env reads).
- [ ] T048 [US4] Benchmark the offline suite: run `nx test integrations-twizzit-client` three times locally, record wall-clock, assert < 10 s (SC-005). If over, identify slowest tests (`jest --listTests --listFailingTests --reporters=default`) and either move them to `.live.spec.ts` or trim. Record the timing in a comment at the top of `jest.config.ts`.

**Checkpoint**: CI-friendly offline suite is the default; live drift detection is one env var away.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Documentation cleanup, lint pass, end-to-end smoke before declaring done.

- [ ] T049 [P] Add JSDoc comments to every public export in `libs/integrations/twizzit-client/src/index.ts` (each function, each class, each schema). Match what's documented in [contracts/client.ts](contracts/client.ts) and [contracts/errors.ts](contracts/errors.ts). One short line per item — no narrative drift.
- [ ] T050 [P] Append a "Twizzit client" subsection to `docs/twizzit/twizzit-api-reference-index.md` linking to `libs/integrations/twizzit-client/README.md`. Update `docs/twizzit/Implementation-plan.md` Phase 1/2 boxes to say "delivered in spec 015".
- [ ] T051 Run `prettier --check libs/integrations/twizzit-client` and `nx lint integrations-twizzit-client` — both must pass clean.
- [ ] T052 Execute the [quickstart.md](quickstart.md) TL;DR snippet against staging (`RUN_TWIZZIT_LIVE_TESTS=1` + creds in env). Confirm `getMemberId(contacts[0])` returns either a numeric string or `null`, and `getMembershipTypes()` returns the 7 known BV types. Treat any failure here as a release blocker.
- [ ] T053 Verify all eight success criteria in spec.md: SC-001 (5-min recipe works), SC-002 (six endpoints, six schemas, six fixture tests), SC-003 (six error variants tested), SC-004 (spot-review of auth-failure-path message construction — no string-interpolated credentials; the previously-mandated grep gate was removed 2026-05-13), SC-005 (< 10 s offline), SC-006 (recipe documented), SC-007 (Q1/Q2/Q5/Q6/Q8 status filed in docs even if "waiting on Twizzit"), SC-008 (import-boundary test green; also asserts the lib does NOT re-export `axios` types from its public API). Tick each in [checklists/requirements.md](checklists/requirements.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Coordination)**: Runs in parallel with everything else; does not block code work. T004 is the only one that can mutate code (retry constants) and is best deferred until after T025.
- **Phase 1 (Setup)**: T005 → T006 → (T007, T008 in parallel).
- **Phase 2 (Foundational)**: All of T009/T010/T011/T012/T014/T015/T016 in parallel; T013 depends on T009/T010/T011. **Blocks every story phase.**
- **Phase 3 (US1)**: Tests T017/T018/T019/T020 written before/alongside implementation T021/T022/T023/T024/T025. T026 (live) at the end.
- **Phase 4 (US2)**: Independent of US1's tests but depends on US1's implementation (`TwizzitClient` class). T031/T032/T033/T034 in parallel; T035/T036/T037/T038 in parallel after their schemas; T039 wires them; T040/T041 finish.
- **Phase 5 (US3)**: Depends on US1+US2 completed (re-uses their client setup). T042/T043/T044 mostly parallel.
- **Phase 6 (US4)**: T046 depends on US1/US2/US3 tests existing. T047 standalone. T048 last.
- **Phase 7 (Polish)**: After all stories.

### Story Independence

- US1 is the MVP — shippable on its own (authenticate + organizations is enough to verify the architecture).
- US2 sits on top of US1's client class but adds independently-testable endpoints.
- US3 is mostly test coverage — it can run in parallel with the second half of US2 if a second developer is available.
- US4 is CI ergonomics — final pass; can also run in parallel with US3 once US1+US2 are stable.

### Within Each Phase

- Tests first (where listed), implementation after — but parallel writing is fine if tests + implementation are split between two developers.
- Models (schemas) before endpoints; endpoints before client wiring.

---

## Parallel Example: Phase 2 Foundational

```bash
# All independent — different files, no internal dependencies:
Task: "T009 Create Logger interface at libs/integrations/twizzit-client/src/logger.ts"
Task: "T010 ~~Create redact utility~~ — REMOVED, see research.md R12"
Task: "T011 Create six error classes at libs/integrations/twizzit-client/src/errors.ts"
Task: "T012 Create shared schemas at libs/integrations/twizzit-client/src/schemas/shared.ts"
Task: "T014 Create pagination helper + test at libs/integrations/twizzit-client/src/pagination.ts + test/pagination.spec.ts"
Task: "T015 Create federation gateway at libs/integrations/twizzit-client/src/seam.ts"
Task: "T016 Create no-forbidden-imports test at libs/integrations/twizzit-client/test/no-forbidden-imports.spec.ts"
# T013 (http.ts) runs after T009/T010/T011 land.
```

## Parallel Example: Phase 4 US2 schemas + endpoints

```bash
# Four schemas, four endpoints — all different files:
Task: "T031 schemas/contact.ts"
Task: "T032 schemas/membership.ts"
Task: "T033 schemas/membership-type.ts"
Task: "T034 schemas/extra-field.ts"
# Then in parallel after their respective schemas:
Task: "T035 endpoints/contacts.ts"
Task: "T036 endpoints/memberships.ts"
Task: "T037 endpoints/membership-types.ts"
Task: "T038 endpoints/extra-fields.ts"
# T039 (wire onto TwizzitClient) is serial.
```

---

## Implementation Strategy

### MVP First (US1 only)

1. T005–T008 (Setup).
2. T009–T016 (Foundational).
3. T017–T026 (US1 — auth + organizations).
4. **STOP and VALIDATE**: Run `RUN_TWIZZIT_LIVE_TESTS=1 nx test integrations-twizzit-client --testPathPattern .live.spec.ts`. Confirm staging returns `{ id: 34245, name: "Badminton Belgium" }`.
5. Optionally cut a PR here — the architecture is proven and the public surface is one-third complete.

### Incremental Delivery

1. Setup + Foundational + US1 → MVP, demonstrable to stakeholders.
2. Add US2 → all six endpoints typed + tested → demo "we can call every endpoint we said we'd call".
3. Add US3 → error-handling guarantees are now load-bearing → demo with deliberately-broken creds and a deliberately-mutated fixture.
4. Add US4 → CI is green; lib is ready for `apps/worker/sync` to depend on in a later spec.
5. Polish (T049–T053) → release.

### Parallel Team Strategy

With two developers after Phase 2:

- Dev A: US1 (T017–T026) then US3 (T042–T045).
- Dev B: US2 schemas (T031–T034) and fixtures (T027–T028) in parallel; merge T039 once US1's `TwizzitClient` is committed.
- Either: US4 + Polish, last.

---

## Notes

- [P] tasks = different files, no dependencies. Same-file tasks are sequenced even when unrelated in spirit.
- Every task has a concrete file path; LLM-executable without further clarification.
- Commit cadence: after each task that introduces a new file, or after a logical pair (schema + endpoint).
- Phase 0 coordination tasks (T001–T004) are visible here so they have owners; they do NOT block any T005+ code task.
- Closing the gap-doc questions (Q1/Q3/Q5) may surface follow-ups that adjust retry constants or schemas — these are tracked in T004 and as comments in the lib's README, not as new tasks (recipe SC-006 covers any follow-up).
