# `GET /memberships` — Swagger contract (captured 2026-05-13)

Source: Twizzit Swagger UI for Badminton Belgium API key. Captured by user, pasted in MAQA chat 2026-05-13.

```
[membership {
  id                   integer
  contact-id           integer
  membership-type-id   integer
  season-id            integer  nullable: true
  start-date           string
  end-date             string
  club-id              integer  nullable: true
  extra-field-values   [{ … }]
}]
```

The Swagger description for `extra-field-values` is the same `{ extra-field, value }` envelope used by `GET /contacts` — see [contacts-swagger.md](contacts-swagger.md) for that subshape.

## Drift vs `libs/integrations/twizzit-client/src/schemas/membership.ts` (current as of d9c0b2f8c)

| Field | Current schema | Swagger | Action |
|-------|---------------|---------|--------|
| `id` | `number` (int, > 0) | `integer` | match — OK |
| `contact-id` | `number` (int) | `integer` | match — OK |
| `membership-type-id` | `number` (int) | `integer` | match — OK |
| `season-id` | `number \| null` | `integer, nullable: true` | match — OK |
| `start-date` | `string` (ISO date) | `string` | match — OK |
| `end-date` | `string \| null` (with `""` → `null` normalisation) | `string` (not marked nullable) | **keep `""` normalisation**, but note Swagger may under-document. Live samples in [api-exploration.md](api-exploration.md) show `end-date: ""` for active memberships, so the normalisation is correct in practice. |
| `club-id` | `number` (required) | `integer, nullable: true` | **CHANGE** to `number \| null`. Currently the schema would throw on a loan-transfer membership or any membership where the club has been removed but the record retained. |
| `extra-field-values` | `ExtraFieldValueSchema[]` | array, subshape same as contacts | apply the **same kebab-case / `attributes` renames documented in [contacts-swagger.md](contacts-swagger.md)** to the `ExtraFieldValueSchema` shared by both Contact and Membership. |

## Why `club-id` nullable matters

The integration plan (Phase 3 of `docs/twizzit/Implementation-plan.md`) drives sync from `Memberships`. A null `club-id` will happen any time:
- A membership has been administratively detached from its club (rare but possible).
- A future federation-level membership type (e.g. national-team affiliation) isn't club-scoped.

Strict zod with non-nullable `club-id` would crash the sync on the first such row. The fix is one-line — `z.number().int().positive().nullable()` — but it cascades: any downstream code that compares `member.club-id` to a Badman `Club` must handle null. That's later-phase concern (sync engine spec), but **the schema must be loose enough not to crash**.

## Follow-up actions

Bundle with the contacts-swagger follow-up agent:

1. Update `src/schemas/membership.ts`: make `club-id` nullable.
2. Apply the shared `ExtraFieldValueSchema` renames (extra-field, attributes, options) — they affect both contact and membership.
3. Regenerate `test/__fixtures__/memberships.page-1.200.json` to include one row with `club-id: null` (synthetic; refresh from staging later) so the nullable branch is actually exercised.
4. Update [data-model.md](../../specs/015-twizzit-api-client/data-model.md) Membership section.
5. Confirm `end-date: ""` convention against the live staging response — if Swagger's "not nullable" is accurate, our `""` → null normalisation is harmless but cosmetic; if live data ever emits literal `null`, the schema as written already accepts it.

## Why not patch now?

Recovery feature agent `ad0aa333280058128` is still running (T042–T053 — redact-fix + Phases 6/7). Schema edits during its run risk merge conflicts. Patch follows a focused schema-refresh dispatch after it completes.
