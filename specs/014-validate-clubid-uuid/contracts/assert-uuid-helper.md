# Contract: `assertUUID` helper

The single utility that classifies non-UUID arguments at mutation entry points.

## Location

```text
libs/backend/graphql/src/utils/assert-uuid.ts
```

Re-exported from `libs/backend/graphql/src/utils/index.ts` alongside `error-codes`.

## Signature

```ts
import { validate as isUUID } from "uuid";
import { GraphQLError } from "graphql";
import { ErrorCode } from "./error-codes";

/**
 * Reject a GraphQL `ID` argument that is not a UUID.
 * Use at the top of any mutation whose `id`/`fooId` arg is contractually a UUID
 * (i.e. anywhere the resolver immediately does `Model.findByPk(id)`).
 *
 * Read-side resolvers that accept UUID-or-slug (e.g. `clubs.club(id)`) MUST NOT
 * call this — they branch on `isUUID(id)` instead.
 *
 * @param value   the raw arg as received from GraphQL
 * @param field   the GraphQL arg name (e.g. "clubId", "id") — included in the error payload
 * @param context optional extra context merged into `extensions` (e.g. `{ userId }`)
 *
 * @throws GraphQLError with extensions.code === ErrorCode.BAD_USER_INPUT when value is not a UUID
 */
export function assertUUID(
  value: string,
  field: string,
  context?: Record<string, unknown>,
): void;
```

## Behavior

- If `isUUID(value) === true` → return (void). No side effects.
- If `isUUID(value) === false` → throw `new GraphQLError(message, { extensions })` where:
  - `message`: ``` `${field} must be a UUID, got: ${JSON.stringify(value)}` ```
  - `extensions.code`: `ErrorCode.BAD_USER_INPUT`
  - `extensions.field`: the `field` argument
  - `extensions.value`: the offending value (echoed back so the frontend can present it; NEVER sanitized — debugging would suffer)
  - All keys from the optional `context` argument are merged into `extensions` (after the three above; on key collision the helper's own keys win, to keep the contract stable)

## Edge cases (exhaustive)

| Input | Result |
|---|---|
| canonical lowercase UUID `f47ac10b-58cc-4372-a567-0e02b2c3d479` | pass |
| uppercase UUID `F47AC10B-58CC-4372-A567-0E02B2C3D479` | pass (uuid validator is case-insensitive) |
| `""` (empty string) | throw |
| `"smash-for-fun"` (slug) | throw |
| `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` (UUID-shaped, non-hex) | throw |
| `" f47ac10b-58cc-4372-a567-0e02b2c3d479 "` (whitespace-wrapped) | throw — the helper does not trim |
| Null / `undefined` | not reachable in practice (GraphQL `NonNull` rejects upstream); if it does reach the helper, throw — `isUUID(undefined)` returns false |

## Tests

Co-located: `libs/backend/graphql/src/utils/assert-uuid.spec.ts`. Cases match the table above. Plus one case asserting `context` merge: `assertUUID(badValue, "clubId", { userId: "abc" })` produces `extensions.userId === "abc"`.

## Non-goals

- The helper does NOT format a localized message; the message is debug-facing and English-only. (Principle II — no i18n diff.)
- The helper does NOT log. Resolvers MAY log around the throw if they already have a logger and want to record the bad input alongside the user id.
- The helper does NOT distinguish slug vs garbage vs whitespace; all are `BAD_USER_INPUT`. Callers do not need that granularity.
