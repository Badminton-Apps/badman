# `GET /extra-fields` — Swagger contract (captured 2026-05-13)

Source: Twizzit Swagger UI for Badminton Belgium API key. Captured by user, pasted in MAQA chat 2026-05-13.

```
[extra-field {
  id          integer
  name        { EN: string, NL: string, FR: string }
  type        string
  location    string
  options     [{ }]
  attributes  [extra-field-attribute { id: integer, name: string, type: string }]
}]
```

**Important**: this is the same `extra-field` Swagger model definition reused inside `extra-field-values[].extra-field` on `GET /contacts` (see [contacts-swagger.md](contacts-swagger.md)). Whatever choice we make for the standalone schema MUST match the embedded one — they're the same type.

## Drift vs `libs/integrations/twizzit-client/src/schemas/extra-field.ts` (current as of d9c0b2f8c)

| Field | Current schema | Swagger | Action |
|-------|---------------|---------|--------|
| `id` | `number` (int, > 0) | `integer` | match — OK |
| `name` | `LocalisedNameSchema` | `{ EN, NL, FR }` | match — OK |
| `type` | enum `"Text" \| "Date" \| "Single select" \| "Multiple select" \| "Checkbox"` | `string` (unconstrained) | **keep enum** — strict-everywhere policy. Live capture in [api-exploration.md](api-exploration.md) shows only these 5 values. A new value crashes the sync via `TwizzitValidationError` (desired). |
| `location` | union `"Contact" \| "Membership" \| "" \| null` | `string` (unconstrained, not nullable) | **keep narrow union** — live data shows `"Contact"`, `"Membership"`, and `""` (empty string when the field is club-level / global). Strict-everywhere policy: a new location enum value triggers a deliberate schema bump. |
| `options` | `string[]` | `[{ }]` — array of objects, inner shape unspecified | **CONFLICT with Swagger; trust live data** — the api-exploration capture shows real string-array values, e.g. `["VZW / ASBL", "Feit. vereniging /association de fait"]` for "Rechtsvorm", `["Bruxelles", "Brabant-Wallon", "Hainaut", …]` for "Province". Live data is `string[]`. Swagger's `[{}]` is a Swagger-generator quirk for "untyped array" — likely the OpenAPI schema author never tightened it. **Keep `z.array(z.string())` and verify on first live call.** If live ever returns an object, surface as `TwizzitValidationError` and reconsider. |
| `attributes` | inline `{ id, name, type }[]` | named `extra-field-attribute { id, name, type }[]` | match — OK (Swagger just gave the inner shape a name; structurally identical). |

## Verdict

**No drift fixes needed for this schema.** Strict-everywhere policy keeps us narrower than Swagger on enums; live data confirms the `options: string[]` choice over Swagger's `[{}]`.

## Cross-cutting note for the schema-refresh follow-up

The embedded variant of this same model (inside contacts) carries the **kebab-case `extra-field` wrapper key** and **`attributes`** (vs the current camelCase `extraField` / `extraFieldAttributes` in our schema). When the follow-up agent renames those, both the standalone `ExtraFieldSchema` and the embedded `ExtraFieldValueSchema` must end up referencing the SAME `extra-field` shape — share a single zod object literal, don't duplicate.

The standalone shape (this file) is already correct for the lib; the embedded `extra-field-values[].extra-field` envelope inside contacts is what needs renaming.

## Follow-up

- Bundle into the schema-refresh follow-up agent (no code change to `src/schemas/extra-field.ts` itself).
- Cross-reference: the renames called out in [contacts-swagger.md](contacts-swagger.md) and [memberships-swagger.md](memberships-swagger.md) for the embedded variant must end up reusing the same `ExtraFieldSchema` defined here. Eliminating duplication is the win.
