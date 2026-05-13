# `GET /contacts` — Swagger contract (captured 2026-05-13)

Source: Twizzit Swagger UI for Badminton Belgium API key. Captured by user, pasted in MAQA chat 2026-05-13.

```json
[
  {
    "id": 0,
    "name": "string",
    "first-name": "string",
    "last-name": "string",
    "date-of-birth": "string",
    "gender": "string",
    "nationality": "string",
    "language": "string",
    "account-number": "string",
    "registry-number": "string",
    "number": 0,
    "email-1": { "target": "string", "email": "string" },
    "email-2": { "target": "string", "email": "string" },
    "email-3": { "target": "string", "email": "string" },
    "mobile-1": { "target": "string", "cc": "string", "number": "string" },
    "mobile-2": { "target": "string", "cc": "string", "number": "string" },
    "mobile-3": { "target": "string", "cc": "string", "number": "string" },
    "home": { "target": "string", "cc": "string", "number": "string" },
    "address": {
      "street": "string",
      "number": "string",
      "box": "string",
      "postalCode": "string",
      "city": "string",
      "country": { "EN": "string", "NL": "string", "FR": "string" }
    },
    "has-profile-image": true,
    "extra-field-values": [
      {
        "extra-field": {
          "id": 0,
          "name": { "EN": "string", "NL": "string", "FR": "string" },
          "type": "string",
          "location": "string",
          "options": ["string"],
          "attributes": [
            { "id": 0, "name": "string", "type": "string" }
          ]
        },
        "value": {
          "value": "string",
          "attributes": [
            { "attribute-id": 0, "value": "string" }
          ]
        }
      }
    ]
  }
]
```

## Drift vs `libs/integrations/twizzit-client/src/schemas/contact.ts`

> **Live data 2026-05-13 — Swagger was wrong on multiple points. Schema is correct as-is.**
>
> The live test run (`RUN_TWIZZIT_LIVE_TESTS=1`) against the Badminton Belgium staging tenant on 2026-05-13
> resolved the Swagger vs. api-exploration.md ambiguity. The wire format matches the **camelCase** shapes
> from api-exploration.md, NOT the Swagger documentation. All items below reflect verified live reality.

| Field | Wire format (live-verified 2026-05-13) | Swagger (wrong) | Schema status |
|-------|----------------------------------------|-----------------|---------------|
| `first-name` | present as `string` | `string` | ✅ already in schema |
| `last-name` | present as `string` | `string` | ✅ already in schema |
| `number` | `number \| null` | `number` | ✅ correct |
| `phone` | **`phone`** (key name) | `home` | ✅ schema uses `phone` — Swagger wrong |
| `extra-field-values[].extraField` | **`extraField`** (camelCase) | `extra-field` (kebab) | ✅ schema uses `extraField` — Swagger wrong |
| `extra-field-values[].extraField.extraFieldAttributes` | **`extraFieldAttributes`** (camelCase) | `attributes` | ✅ schema uses `extraFieldAttributes` — Swagger wrong |
| `extra-field-values[].extraField.options` | **absent** on embedded variant | present (`[{}]`) | ✅ schema omits it (`.strict()` enforced) — Swagger wrong |
| `value.attributes[].attribute-id` | `attribute-id` (kebab) | `attribute-id` | ✅ match |

## Swagger vs. live resolution

The Swagger documentation is **incorrect** for the embedded `extra-field-values` subshape. Twizzit's actual
JSON serialiser uses camelCase for nested object keys (`extraField`, `extraFieldAttributes`) while the top-level
fields remain kebab-case (`extra-field-values`, `attribute-id`). The Swagger OpenAPI definition reuses a
shared `extra-field` model definition that documents the **standalone** `/extra-fields` shape — which uses
different key conventions from the embedded context.

The `phone` vs `home` discrepancy is a Swagger authoring error; the live response always contains `phone`.

### Deferred items (no longer needed)

All "Follow-up actions" listed in earlier versions of this document have been completed or cancelled:
- Schema already uses `extraField`, `extraFieldAttributes`, `phone`.
- No `options` field on embedded variant — confirmed absent in live data.
- `test/__fixtures__/contacts.page-*.200.json` already reflect the live-verified shape.
