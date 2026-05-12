# Implementation Plan: Twizzit API Client (Phases 0–2 Foundation)

**Branch**: `015-twizzit-api-client` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-twizzit-api-client/spec.md`

## Summary

Deliver a buildable, framework-free, read-only TypeScript Twizzit API client at `libs/integrations/twizzit-client`. The library exposes one typed function per Twizzit endpoint Badman depends on (`authenticate`, `getOrganizations`, `getContacts`, `getMemberships`, `getMembershipTypes`, `getExtraFields`), with zod schemas as the single source of truth for both runtime validation and TypeScript types, a discriminated-union error model (auth / validation / network / rate-limit / server / client), transparent offset-based pagination, in-memory token caching with proactive 80%-lifetime refresh and reactive 401-retry fallback, and an injectable no-op-by-default `Logger` interface. No Sequelize, no GraphQL, no Bull, no DB writes — that's a hard scope boundary enforced by an import-lint test.

Tests run hermetically in CI against recorded fixtures captured from staging Twizzit; an opt-in `RUN_TWIZZIT_LIVE_TESTS=1` suite exercises the same parsers against the live staging tenant. Phase 0 research confirms credentials provisioning, base URL, HTTP-client choice, and resolves (or defers, with explicit caveats) the gap-doc questions Q1/Q2/Q5/Q6/Q8.

## Technical Context

**Language/Version**: TypeScript 5.x targeting Node.js 20+ (matches existing `apps/worker/sync` toolchain).
**Primary Dependencies**: `zod` (validation + type inference); Node 18+ global `fetch` (no extra HTTP-client dep); `jest` for tests; `nx` for the buildable lib.
**Storage**: N/A. The lib is read-only, in-memory only, no DB, no Redis, no filesystem writes outside test fixtures.
**Testing**: Jest, co-located `*.spec.ts` (offline, fixtures) and `*.live.spec.ts` (gated by `RUN_TWIZZIT_LIVE_TESTS=1`).
**Target Platform**: Node.js worker process (`apps/worker/sync`); the lib itself is platform-agnostic Node.
**Project Type**: Buildable Nx library (single project).
**Performance Goals**: Offline test suite < 10s (SC-005). Live full-fed contacts pull (≈160 k records) must respect Twizzit rate-limit headroom (FR-004) — exact target deferred to Phase 0 research item R3.
**Constraints**:
- Zero leakage of password / bearer token / `Authorization` value into logs, errors, fixtures (FR-016, SC-004).
- No imports of `@badman/backend-database`, `@badman/backend-graphql`, `@badman/backend-queue`, Sequelize models, NestJS decorators inside the lib (FR-007, FR-020, SC-008).
- Strict zod everywhere; no `.passthrough()` escape hatch (Clarification 2026-05-12 #5).
**Scale/Scope**: 6 endpoint functions in v1; designed so a 7th endpoint slots in via the published recipe (SC-006). Multi-page pulls bounded by `maxPages` default (R5 below).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.1.0 has five principles. Applicability and compliance:

| Principle | Applies? | Verdict | Notes |
|-----------|----------|---------|-------|
| I. Code-First GraphQL via Sequelize Models | **No** | PASS by non-applicability | The lib introduces no persistent entity, no GraphQL `@ObjectType`, no Sequelize model. Entities here are zod schemas representing **external** Twizzit shapes, not Badman domain entities. FR-007 / FR-020 forbid importing Sequelize / GraphQL into the lib. |
| II. Translation Discipline (NON-NEGOTIABLE) | **No** | PASS by non-applicability | No `all.json` keys, no user-facing strings. Error messages are developer-facing English-only (per existing project convention for internal libs). If any user-visible surface is later added in a consumer phase, that change MUST route through `translation-manager`. |
| III. Transactional Mutations | **No** | PASS by non-applicability | No GraphQL mutations, no DB writes, no Sequelize transactions — the lib is read-only against an external HTTP API. Idempotency for *create* mutations is not a concept here; idempotency at the sync-engine layer is a later-phase concern. |
| IV. Resolver Test Discipline | **No** | PASS by non-applicability | No resolvers. Tests follow the lib's own convention: co-located `*.spec.ts` with mocked HTTP layer + zod-fixture parser tests + opt-in live tests. Pattern documented in `quickstart.md`. |
| V. Legacy Frontend Boundary (NON-NEGOTIABLE) | **No** | PASS by non-applicability | The lib lives under `libs/integrations/` and does not touch `apps/badman/` or `libs/frontend/`. |

**Technology stack alignment** (constitution § Technology Stack & Constraints):

- ✅ Nx workspace — buildable Nx lib at `libs/integrations/twizzit-client`.
- ✅ Jest for tests; `nx test integrations-twizzit-client`.
- ✅ Prettier — code formatted per repo defaults.
- ✅ TypeScript inferred-from-zod types — no hand-written DTO drift.
- ✅ Auth via Auth0 JWKS is irrelevant here; the lib's auth concerns are scoped to the Twizzit JWT.

**Result**: No violations. Complexity Tracking section omitted (nothing to justify).

## Project Structure

### Documentation (this feature)

```text
specs/015-twizzit-api-client/
├── plan.md              # This file
├── research.md          # Phase 0 output — open decisions resolved or explicitly deferred
├── data-model.md        # Phase 1 output — zod schema shapes per entity
├── quickstart.md        # Phase 1 output — README-style usage + endpoint-recipe
├── contracts/           # Phase 1 output — TypeScript signatures the lib exposes
│   ├── client.ts        # `TwizzitClient` class, config type, and endpoint function signatures
│   └── errors.ts        # Discriminated-union error contract
├── checklists/
│   └── requirements.md  # Existing spec-quality checklist
├── spec.md              # Feature spec
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
libs/integrations/twizzit-client/
├── README.md                          # Public quickstart + endpoint-recipe + fixture-anonymisation policy
├── project.json                       # Nx project descriptor
├── tsconfig.lib.json
├── tsconfig.spec.json
├── jest.config.ts
├── src/
│   ├── index.ts                       # Public exports: TwizzitClient, TwizzitError variants, schemas, types
│   ├── client.ts                      # `TwizzitClient` class, session state, retry orchestration
│   ├── http.ts                        # Thin fetch wrapper: bearer-injection, org-ids query, 401/429/5xx classification
│   ├── errors.ts                      # `TwizzitAuthError`, `TwizzitValidationError`, `TwizzitNetworkError`,
│   │                                   #   `TwizzitRateLimitError`, `TwizzitServerError`, `TwizzitClientError`
│   ├── logger.ts                      # `Logger` interface + `noopLogger`
│   ├── redact.ts                      # Secret-redaction utility (used by every error + log call)
│   ├── pagination.ts                  # `paginate()` helper for limit/offset loop with maxPages bound
│   ├── seam.ts                        # Federation-agnostic interface (FR-008) — `FederationContactSource`,
│   │                                   #   `FederationMembershipSource` etc. Twizzit client implements these.
│   ├── endpoints/
│   │   ├── authenticate.ts            # POST /authenticate
│   │   ├── organizations.ts           # GET /organizations
│   │   ├── contacts.ts                # GET /contacts (paginated)
│   │   ├── memberships.ts             # GET /memberships (paginated)
│   │   ├── membership-types.ts        # GET /membershipTypes
│   │   └── extra-fields.ts            # GET /extra-fields
│   └── schemas/
│       ├── shared.ts                  # Localised name { EN, NL, FR }, address, email/mobile/phone shapes
│       ├── authenticate.ts            # AuthenticateResponseSchema, JWT-exp helper
│       ├── organization.ts            # OrganizationSchema
│       ├── contact.ts                 # ContactSchema, ExtraFieldValueSchema
│       ├── membership.ts              # MembershipSchema
│       ├── membership-type.ts         # MembershipTypeSchema
│       └── extra-field.ts             # ExtraFieldSchema
└── test/
    ├── __fixtures__/                  # Recorded JSON responses from staging (anonymised)
    │   ├── organizations.200.json
    │   ├── contacts.page-1.200.json
    │   ├── contacts.page-2.200.json
    │   ├── memberships.page-1.200.json
    │   ├── membership-types.200.json
    │   └── extra-fields.200.json
    ├── client.spec.ts                 # Unit + fixture tests (auth, org, each endpoint, redaction, retry, 429, 5xx)
    ├── pagination.spec.ts             # Multi-page loop + maxPages bound
    ├── redact.spec.ts                 # Redaction test (FR-016, SC-004)
    ├── no-forbidden-imports.spec.ts   # SC-008 enforcement
    └── client.live.spec.ts            # Opt-in (RUN_TWIZZIT_LIVE_TESTS=1) — hits staging Twizzit
```

**Structure Decision**: Single buildable Nx library at `libs/integrations/twizzit-client`. Created via `nx g @nx/js:library twizzit-client --directory=libs/integrations` (exact generator command captured in `tasks.md` once `/speckit-tasks` runs). No new top-level directory needed. The `libs/integrations/` subdirectory is introduced by this feature — it's currently absent from the repo and will host this and any future external-system clients (per N3.1).

## Complexity Tracking

Not needed — no Constitution violations to justify.
