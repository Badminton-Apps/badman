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

## Drift vs `libs/integrations/twizzit-client/src/schemas/contact.ts` (current as of d9c0b2f8c)

| Field | Current schema | Swagger | Action |
|-------|---------------|---------|--------|
| `first-name` | absent | `string` | **ADD** as required string |
| `last-name` | absent | `string` | **ADD** as required string |
| `number` | `string \| null` | `number` (int) | **CHANGE** to `number` (or `number \| null` — depends on what live data shows for absent values) |
| `phone` | present | absent — Swagger uses `home` | **RENAME** `phone` → `home` |
| `extra-field-values[].extraField` | `extraField` (camelCase) | `extra-field` (kebab-case) | **RENAME** field key to `extra-field` — note: the original captured response in [api-exploration.md](api-exploration.md) showed `extraField` (camelCase). One of the two sources is wrong; treat **Swagger as authoritative** until a live re-capture proves otherwise. |
| `extra-field-values[].extra-field.extraFieldAttributes` | `extraFieldAttributes` | `attributes` | **RENAME** inside the nested object. Also confirms top-level `/extra-fields` shape carries `attributes` (already matches). |
| `extra-field-values[].extra-field.options` | absent on the embedded variant | present, typed as `[{}]` — array of objects, inner shape unspecified by Swagger | **ADD** `options` inside the embedded extra-field. Provisionally type as `z.array(z.unknown())` until a live response with non-empty options arrives. Note: the *standalone* `/extra-fields` resource carries `options` as `string[]` based on the api-exploration capture — Swagger may be under-documenting the embedded variant by reusing the same `extra-field` model definition without tightening the inner shape. **Verify against live response** before tightening. |
| `extra-field-values[].extra-field.attributes` (item type) | typed inline | typed as `extra-field-attribute { id, name, type }` (named Swagger model) | shape matches — `{ id: number, name: string, type: string }` — already correct in `ExtraFieldValueSchema`; just confirming. |

## Discrepancy between Swagger and the api-exploration.md capture

The api-exploration.md sample (also pasted by the user during /speckit-specify) showed:
- `extraField` (camelCase)
- `extraFieldAttributes` (camelCase)

The Swagger says `extra-field` and `attributes`. This conflict needs to be resolved with a live call. **Two possibilities**:

1. Twizzit serialises camelCase in the actual response but Swagger documents it kebab-case (Swagger generator quirk).
2. Twizzit changed the response format between the api-exploration capture and now.

**Until the next live call confirms which is real, the lib MUST accept the Swagger shape** (kebab-case `extra-field` + `attributes`). The strict-zod policy will surface drift loudly on the first live call — that is exactly what it's for. If the live response is camelCase, we flip the schema in a deliberate fix commit.

### Same-day confirmation 2026-05-13

The user pasted the hierarchical Swagger view a second time on 2026-05-13 to confirm. It includes:
- `extra-field` as the wrapper key (kebab) — confirmed
- `attributes` inside the embedded `extra-field` model — confirmed; element type is the named `extra-field-attribute { id: integer, name: string, type: string }`
- `options` exists on the embedded variant, typed as `[{ }]` — array of objects, inner shape **not defined** by Swagger
- `value.attributes[].attribute-id` (kebab) — matches our existing schema

No new drift. The earlier table is correct; only the `options` row is loosened from `string[]` to `unknown[]` pending live verification.

## Follow-up actions (after the recovery agent finishes T042–T053)

1. Update `src/schemas/contact.ts` with the six changes in the drift table above.
2. Regenerate `test/__fixtures__/contacts.page-1.200.json` and `contacts.page-2.200.json` to match the new shape (the existing fixtures are synthetic anyway — agent flagged them as "refresh from staging").
3. Re-run `npx nx test integrations-twizzit-client` and patch any test that referenced the old field names.
4. Update [data-model.md](../../specs/015-twizzit-api-client/data-model.md) Contact section. *(Spec is sealed for the current PR; this becomes a follow-up spec edit or an addendum doc.)*
5. Confirm the change against the live staging response on the next `RUN_TWIZZIT_LIVE_TESTS=1` pass — if Twizzit actually returns camelCase, document the Swagger-vs-runtime mismatch under [gaps-and-open-questions.md](gaps-and-open-questions.md) as a new Q.

## Why not patch now?

A recovery feature agent is running in the background fixing redact tests, Phases 6 + 7, and possibly touching `src/client.ts` / `src/http.ts` / lint output. Schema edits during its run risk merge conflicts. This document is a hand-off note for the next dispatch.
