# Contract: saveEnrollmentRemarks Mutation

## GraphQL Schema

```graphql
input SaveEnrollmentRemarksInput {
  clubId: ID!
  season: Int!
  remarks: String!
  adminEmail: String!
}

type Mutation {
  saveEnrollmentRemarks(input: SaveEnrollmentRemarksInput!): Boolean!
}
```

## Auth

Requires an authenticated session (JWT validated by global `PermGuard`). Any authenticated user may call this mutation for any `clubId`. No club-ownership check.

Unauthenticated requests (missing or invalid JWT) → `PERMISSION_DENIED`.

## Happy Path

**Request**:

```json
{
  "clubId": "a3e1f2b4-...",
  "season": 2025,
  "remarks": "Wij spelen enkel op maandag.",
  "adminEmail": "admin@myclub.be"
}
```

**Response**: `true`

**Side effects**:

- Row inserted into `event.enrollment_remarks`
- Email sent to `jeroen@badmintonvlaanderen.be` and `arno@dashdot.be`

## Error Codes

| Scenario                                    | `extensions.code`   | HTTP-equivalent | Extra `extensions` fields                                 |
| ------------------------------------------- | ------------------- | --------------- | --------------------------------------------------------- |
| Not authenticated                           | `PERMISSION_DENIED` | 401             | —                                                         |
| `clubId` is not a valid UUID                | `BAD_USER_INPUT`    | 400             | `field: "clubId"`                                         |
| Club not found                              | `CLUB_NOT_FOUND`    | 404             | `clubId`                                                  |
| `remarks` empty or whitespace-only          | `BAD_USER_INPUT`    | 400             | `field: "remarks"`                                        |
| `remarks` exceeds 10,000 chars (after trim) | `BAD_USER_INPUT`    | 400             | `field: "remarks"`, `maxLength: 10000`, `actualLength: N` |
| `adminEmail` empty or whitespace-only       | `BAD_USER_INPUT`    | 400             | `field: "adminEmail"`                                     |

## Notification Email

**Subject**: `Inschrijving opmerking gered - {club.name} (seizoen {season})`  
**To**: `jeroen@badmintonvlaanderen.be`, `arno@dashdot.be`  
**Body fields**: club full name, remarks (verbatim), submission timestamp  
**Non-production**: all recipients overridden by `DEV_EMAIL_DESTINATION` env var (standard `MailingService` behaviour)

## Idempotency

None. Each call creates a new row. Multiple submissions from the same `(clubId, season)` are accepted.
