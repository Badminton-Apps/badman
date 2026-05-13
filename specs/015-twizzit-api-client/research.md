# Phase 0 Research: Twizzit API Client

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-12

This document resolves the open decisions enumerated in the spec's Technical Context and the gap-doc questions tied to SC-007. Each item follows: **Decision** → **Rationale** → **Alternatives considered**.

---

## R1. HTTP client

**Decision (2026-05-13, supersedes earlier)**: Use **`axios`**. Specifically, construct a per-`TwizzitClient` `AxiosInstance` whose:

- `baseURL` is the configured Twizzit URL.
- `paramsSerializer` produces the kebab-case bracket syntax Twizzit expects (`organization-ids[]=34245`).
- A **request interceptor** injects `Authorization: Bearer <token>` and the `organization-ids[]` query parameter onto every call after `authenticate()` + `getOrganizations()` have run.
- A **response interceptor** classifies failures into `TwizzitError` variants (`axios.isAxiosError` + `status` + body excerpt) and handles the 401-then-reauth-then-retry-once pattern (FR-013) in one place — no per-endpoint duplication.
- 429 back-off via `axios-retry` (or a manual interceptor) honouring `Retry-After`, bounded by `maxRateLimitRetries` and `maxRetryBudgetMs` (FR-014).

The lib does NOT re-export axios types (`AxiosError`, `AxiosInstance`) — all consumer-visible failures are `TwizzitError` subclasses (FR-015). The axios instance is constructed inside `src/http.ts` and lives on the `TwizzitClient` instance.

**Rationale**: Earlier the choice was Node global `fetch` to minimise dependencies. In implementation, the missing pieces (interceptor pattern for auth refresh + retry, robust 429 retry with `Retry-After`, kebab-bracket `paramsSerializer`) ended up being re-implemented on top of `fetch` by the MVP and recovery agents. The user directed (2026-05-13) to drop the in-house wrappers and lean on axios's built-in utilities. The dependency cost (~50 KB minified) is negligible for a worker-only lib; the maintainability gain (one interceptor instead of N per-endpoint retry wrappers) is significant.

**Alternatives considered (history kept for context)**:
- `fetch` — was the original choice; reverted because the auxiliary code grew larger than the dependency it saved.
- `undici.request` — same downside as fetch for retry/interceptor concerns; lower-level API.
- `got` — ESM-only, extra dep, fewer middleware options.

**Alternatives also rejected today**:
- Hand-rolling a `withRetry()` wrapper around `fetch` — what we already had; the rework is to delete it.
- Using axios but NOT interceptors (just bare requests) — defeats the point of the swap.

---

## R2. Base URL

**Decision**: `https://app.twizzit.com/v2/api` is the default base URL, derived from the Swagger documentation URL `https://app.twizzit.com/v2/api/documentation/...` in `docs/twizzit/twizzit-api-reference-index.md`. The base URL MUST be overridable via the `TWIZZIT_BASE_URL` environment variable (and as a programmatic config field) so a future staging-only host or local mock server can be slotted in without code changes.

**Rationale**: One production host today; same host serves the staging API key (separate tenant), per the spec's Assumption. The override hook is FR-019-adjacent — it lets the live-test harness target a staging URL if Twizzit ever surfaces one.

**Alternatives considered**:
- Hard-code only — rejected, blocks any future host change without a redeploy.
- Auto-detect from credentials — over-engineering with no payoff today.

---

## R3. Rate-limit policy & retry tuning

**Decision** (provisional, pending Twizzit confirmation per gap Q3):
- On `429 Too Many Requests`: honor `Retry-After` header (seconds or HTTP-date) when present; otherwise apply exponential back-off starting at 1 s, doubling, capped at 30 s.
- Maximum retry attempts on 429: **3**.
- Max wall-clock retry budget per call: **2 minutes**.
- These constants live in `TwizzitClient` config with defaults; consumers can tighten (not loosen) them.
- The live full-pull (≈160 k contacts at the rumored page-size cap of 100 → 1600 pages) is **not** a goal of this lib. Phase 3 sync work will set its own pacing.

**Rationale**: Twizzit explicitly flagged tight limits ("hit the ceiling fast"). A 3-retry / 2-minute budget keeps a single user call bounded and aborts loudly if the federation tenant is throttled, instead of silently slowing every request. The numbers are conservative and easily relaxed once Q3 returns hard numbers.

**Action item** (carry-over to Phase 0 prerequisite tasks): Email Philippe / PandaPanda asking for the published rate-limit numbers (gap Q3). Update this constant set in a follow-up PR if the answer differs materially.

**Alternatives considered**:
- Unlimited retries — rejected; turns a transient incident into a cron-blocking infinite loop.
- Single retry — rejected; too brittle for ordinary network blips that aren't 429.

---

## R4. Pagination page size & `maxPages` default

**Decision** (provisional, pending gap Q2):
- Default `pageSize` = **100**. The API exploration doc and Twizzit's verbal guidance suggest 100 is a sane mid-range; the function accepts an override.
- Default `maxPages` = **2000**. With pageSize 100 this caps a single call at 200 000 items — comfortably above the 160 k contact target documented in the requirements. Hitting `maxPages` MUST throw `TwizzitClientError` with `kind: "max-pages-exceeded"` rather than silently truncating.
- Twizzit's pagination parameters are `limit` and `offset` (confirmed by the user during clarification).

**Rationale**: A finite hard ceiling is non-negotiable (FR-021). The numbers are conservative-but-not-ridiculous; sync engineers can override per call. Failing loudly when the ceiling is hit forces a deliberate review when the federation crosses a size threshold.

**Action item**: Confirm Twizzit's true page-size cap during the first live call. Adjust the default downward if 100 is over the limit (the lib will surface a 4xx if it is).

**Alternatives considered**:
- `maxPages: Infinity` — rejected, contradicts FR-021.
- pageSize 500 / 1000 — premature; we don't yet know if Twizzit accepts it.

---

## R5. Token lifetime detection

**Decision**: Use the **response body fields** `created-on` and `valid-till` (both unix-seconds, kebab-case) returned by `POST /authenticate`. Compute lifetime = `valid-till - created-on`; schedule proactive refresh at `created-on + 0.8 * lifetime`. Treat the JWT itself as opaque — do not parse, do not introspect, do not validate the signature.

**Rationale**: Confirmed by live API response on 2026-05-12: Twizzit's authenticate response carries `created-on` and `valid-till` directly in the body. The observed `valid-till - created-on` is 1800 s, while the JWT's own `exp` claim shows a 24 h lifetime — the body field is the **shorter** and therefore binding value (the server may invalidate a token before its cryptographic expiry). Trusting the body field also keeps the lib JWT-library-free and resilient to Twizzit changing token format. Reactive `401`-retry (FR-013) remains the safety net for any edge case where the cached `valid-till` and the server's real session state diverge.

**Implementation note**: the zod schema for the authenticate response (`data-model.md`) makes both fields required. If a future Twizzit response omits them, the strict schema fails loudly and we adjust deliberately.

**Alternatives considered**:
- Parse JWT `exp` claim — rejected; the live response proves the JWT exp is longer than the actual session validity. Using it would cause silent 401s.
- Always reactive (refresh only on 401) — rejected; observability suffers, and a known-fresh proactive refresh is one fewer source of mid-job latency.
- Use a JWT library — irrelevant given we trust body fields instead.

---

## R6. Environment variables

**Decision**: Three env vars, all owned by the consumer (not the lib):

| Name | Required | Purpose |
|------|----------|---------|
| `TWIZZIT_USERNAME` | Yes | Username passed to `POST /authenticate`. |
| `TWIZZIT_PASSWORD` | Yes | Password passed to `POST /authenticate`. Surface only via env, never via CLI flags or config files. |
| `TWIZZIT_BASE_URL` | No | Override base URL (default `https://app.twizzit.com/v2/api`). |

The lib itself does NOT read `process.env` — consumers read env and pass `credentials` into `new TwizzitClient({ ... })`. This keeps the lib testable and 12-factor-friendly.

**Rationale**: Two-secret model matches Twizzit's `POST /authenticate` body contract. Decoupling from `process.env` keeps the lib hermetic; tests pass credentials directly.

**Alternatives considered**:
- API-key-only (no auth call) — Twizzit doesn't expose an API-key auth flow; this is not optional.
- Reading `process.env` in the lib — couples the lib to a global, breaks parallel tests with different credentials, complicates Next-style edge runtimes. Rejected.

---

## R7. Live-test gating

**Decision**: Live tests are gated by `RUN_TWIZZIT_LIVE_TESTS=1`. Test files use the suffix `*.live.spec.ts` and call `describe.skip` when the env var is unset. CI MUST NOT set this variable in default workflows; a manual `nx test integrations-twizzit-client -- --testPathPattern .live.spec.ts` is the documented local recipe.

**Rationale**: Matches FR-019 and the project's existing `RUN_INTEGRATION_TESTS=1` convention for postgres-only tests.

---

## R8. Fixture anonymisation policy

**Decision**:
- Replace personal data in checked-in fixtures: `name`, all `email-*`, all `mobile-*`, `phone`, `address`, `account-number`, `registry-number`, `number` (federation-side number), `nationality` retained, `language` retained.
- `id`, `contact-id`, `club-id`, `membership-type-id`, `extra-field.id`, and the `"Member ID"` extra-field value are **kept** — they're functionally important for the parser and the values are non-sensitive numerics. Where we want to obscure stable ids in tests, we substitute a deterministic synthetic value documented inline.
- `date-of-birth` and `gender` retained — they're not directly identifying once name/contact data is replaced.
- README of the lib documents this policy explicitly.

**Rationale**: Fixtures need to be realistic enough to validate the parser but cannot ship real federation member PII. The split between "structural / identifier" (kept) and "personal" (synthetic) is the cheapest correct cut.

**Alternatives considered**:
- Anonymise everything including ids — rejected; parser tests would lose their value.
- Don't anonymise (use real staging data) — rejected; staging is a slice of production with real names.

---

## R9. Federation-agnostic seam (FR-008)

**Decision**: Define lightweight TS interfaces in `src/seam.ts` describing **read-only** federation capabilities the sync layer depends on:

```ts
interface FederationOrganization { id: number; name: string }
interface FederationContactSource {
  fetchOrganizations(): Promise<FederationOrganization[]>;
  fetchContacts(opts?: PaginationBounds): Promise<TwizzitContact[]>; // or generic Contact later
  fetchMemberships(opts?: PaginationBounds): Promise<TwizzitMembership[]>;
  fetchMembershipTypes(): Promise<TwizzitMembershipType[]>;
  fetchExtraFields(): Promise<TwizzitExtraField[]>;
}
```

`TwizzitClient` implements `FederationContactSource`. The interface stays **inside this lib** for now; if/when a second federation appears, the interface moves to a shared lib and the entity types get extracted to a federation-agnostic shape. Premature abstraction explicitly avoided (per CLAUDE.md guidance).

**Rationale**: Honors N3.1 without paying the abstraction tax up front. The interface is the *seam*; the *implementation* is Twizzit-specific. When `apps/worker/sync` consumes the lib, it codes against the interface, not the concrete class — that's the inflection point where a future federation can plug in.

**Alternatives considered**:
- No seam — rejected; violates N3.1.
- Full hexagonal-architecture port/adapter split now — rejected as speculative.

---

## R10. Open Twizzit-side questions (SC-007)

These cannot be settled without a live call to Twizzit or a Swagger inspection. The lib design accommodates each:

| Gap-doc Q | Question | Design accommodation |
|-----------|----------|----------------------|
| **Q1** | Is `last-modified` filter shipped? | `getContacts`, `getMemberships` accept an optional `lastModified?: Date` argument from day one. Unset = no filter. Adopting it later is purely additive. |
| **Q2** | Page-size cap & cursor vs offset? | Confirmed offset-based (`limit` + `offset`). Cap unknown; covered by R4 above. If Twizzit returns 422 for too-large pageSize, the surfacing `TwizzitClientError` will tell us — and we'll adjust the default. |
| **Q5** | Soft-delete representation? | Strict zod (Clarification 2026-05-12 #5). If Twizzit later emits a `deleted`/`archived` field, the next live run throws `TwizzitValidationError` and we ship a deliberate schema bump. If Twizzit signals deletion by omission, the client returns `[]` and downstream layers reconcile. |
| **Q6** | Dedicated clubs endpoint? | Not part of FR-009. If a `/clubs` endpoint exists in Swagger, it's added later via the published recipe (SC-006). Until then, `club-id` on memberships is the only club reference. |
| **Q8** | Stable id immutability? | Out of the lib's hands — but assumed-immutable is the only design that works. If Twizzit reassigns ids, the lib still parses correctly; downstream sync logic is what would notice. |

**Action item**: Compile a single email / Slack thread to Philippe / PandaPanda asking Q1, Q3 (rate limits), Q5 (soft-delete), Q6 (clubs endpoint). Answers, when they arrive, are filed under `docs/twizzit/` and trigger schema/config bumps if material.

---

## R11. CI test budget

**Decision**: Offline test suite for the lib targets < 5 s wall-clock (SC-005 target was < 10 s — we leave 50 % headroom). All HTTP calls are stubbed; fixture loading is sync `readFileSync` from `test/__fixtures__/`. Live tests are excluded from CI by default.

**Rationale**: A fast offline suite encourages running it on every save.

---

## Resolved status

All NEEDS-CLARIFICATION items from `plan.md`'s Technical Context are resolved or have an explicit Phase 0 action item. The remaining items (R3 rate limits, R4 page cap, Q1 last-modified) are tracked as Phase 0 prerequisite tasks in `tasks.md` (created by `/speckit-tasks`) and do not block Phase 2 implementation — the design accommodates each unknown.

---

## R12. Credential redaction pipeline (2026-05-13 — reversed)

**Decision**: **Remove** the previously-shipped redaction pipeline (`src/redact.ts`, the `extraSecrets` param threaded through every endpoint function, the deep-walking secret-scrub utility, the end-to-end "no LEAK_ME in any serialised output" grep-gate test in `redact.spec.ts`).

What survives: **construction-time discipline**. The lib must not string-interpolate the password or bearer token into error messages it constructs (e.g. `\`Auth failed with password=${password}\`` is forbidden — say `"Authentication failed (HTTP 401)"` instead). That guarantee is structural, not testable via an automated grep.

**Rationale (per user direction 2026-05-13)**:

- The redaction pipeline was over-engineering for this lib's risk surface. Twizzit's HTTP responses do not echo the password (we already verified by inspecting captured 401 responses), so a 5xx body excerpt does not realistically contain credentials.
- The pipeline cost: a `redact()` utility with edge cases (nested objects, circular refs, primitives), an `extraSecrets` ergonomic across every endpoint, a fragile grep-gate test prone to false positives (test fixtures coincidentally containing the leak sentinel), and ongoing maintenance whenever a new error variant or log site appears.
- The platform that runs the worker (NestJS Fastify + structured logging) has its own log-level redaction. Defence in depth is fine — defence in *triplicate* is not.
- The consumer (`apps/worker/sync`) controls `process.env` and never logs the password by construction. The lib never receives the password except for one call (`POST /authenticate`), and that call's outbound body is sent over HTTPS, not logged.

**What this changes in code** (executed by a follow-up rework agent — see tasks.md updates):

- `src/redact.ts` and `test/redact.spec.ts` → DELETED.
- `src/errors.ts` → drop the "Redaction invariant" note; `bodyExcerpt` is just `string` (truncated for log volume, not scrubbed for secrets).
- `src/http.ts` → drop the `redactSecrets` arg from request helpers.
- `src/endpoints/*.ts` → drop the `extraSecrets` arg.
- `src/client.ts` → stop threading `[password]` to endpoint calls.
- `test/client.auth.spec.ts` → remove the "credential redaction" describe block.
- `test/client.errors.spec.ts` → remove the redaction-related assertions; keep the discriminated-union narrowing.

**Alternatives rejected today**:
- Keep redact, just trim its surface — rejected, the whole concept was the problem.
- Replace redact with a Pino-style serializer registry — same issue at smaller scale, not worth it for a 6-endpoint lib.
