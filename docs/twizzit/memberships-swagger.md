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

## Drift vs `libs/integrations/twizzit-client/src/schemas/membership.ts`

> **Live data 2026-05-13 — all fixes applied. Schema is correct as-is.**

| Field | Wire format (live-verified 2026-05-13) | Swagger | Schema status |
|-------|----------------------------------------|---------|---------------|
| `id` | `integer` | `integer` | ✅ match |
| `contact-id` | `integer` | `integer` | ✅ match |
| `membership-type-id` | `integer` | `integer` | ✅ match |
| `season-id` | `integer \| null` | `integer, nullable: true` | ✅ match |
| `start-date` | `string` | `string` | ✅ match |
| `end-date` | `string \| null` (empty string normalised to null) | `string` (not nullable per Swagger) | ✅ correct — live samples show `""` for active memberships; `""` → null normalisation kept |
| `club-id` | `integer \| null` | `integer, nullable: true` | ✅ **fixed** — schema uses `.nullable()` |
| `extra-field-values` | camelCase embedded shape — see [contacts-swagger.md](contacts-swagger.md) | kebab-case shape (Swagger wrong) | ✅ **uses `ExtraFieldValueSchema` from `schemas/contact.ts`** which is live-verified |

## Notes

`club-id` nullable fix was applied during the 2026-05-13 live test session. A null `club-id` occurs on
loan-transfer memberships and any federation-level membership not scoped to a club.

The `extra-field-values` embedded shape follows the same camelCase convention confirmed for contacts
(`extraField`, `extraFieldAttributes`, no `options`). The schema reuses `ExtraFieldValueSchema` from
`src/schemas/contact.ts` — a single definition shared by both resources.

`end-date: ""` → null normalisation: live data confirms `""` for active memberships. The normalisation
is load-bearing, not cosmetic. Swagger under-documents nullability here (common Swagger generator quirk).
