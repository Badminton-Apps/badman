# Contract: Teams Export Endpoint

**Feature**: [spec.md](../spec.md)
**Date**: 2026-05-06

---

## Endpoint

```
GET /api/export/teams
```

---

## Query Parameters

| Parameter | Type   | Required | Default | Validation                        |
|-----------|--------|----------|---------|-----------------------------------|
| `eventId` | string | Yes      | —       | Must be a valid UUID (v4)         |
| `format`  | string | No       | `xlsx`  | Must be `xlsx` or `csv` if present |

---

## Auth

| Requirement | Detail                                      |
|-------------|---------------------------------------------|
| Token       | `Authorization: Bearer {token}` required    |
| Permission  | `edit:competition`                          |

---

## Success Response

### `format=xlsx` (or omitted)

```
HTTP 200
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="{competitionName}.xlsx"

<binary XLSX body>
```

Sheet name: `Teams`

### `format=csv`

```
HTTP 200
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="{competitionName}.csv"

<UTF-8 CSV body, RFC 4180, CRLF line endings>
```

---

## Column Contract

Both formats MUST produce exactly these 5 columns in this order:

| # | Header                           | Source field           | Transformation                          |
|---|----------------------------------|------------------------|-----------------------------------------|
| 1 | `Club ID`                        | `Club.clubId`          | None (federation number)                |
| 2 | `Clubnaam`                       | `Club.name`            | None                                    |
| 3 | `Ploegnaam`                      | `Team.name`            | None                                    |
| 4 | `Voorkeur speelmoment (dag)`     | `Team.preferredDay`    | ENUM → Dutch day name; `""` if null     |
| 5 | `Voorkeur speelmoment (tijdstip)`| `Team.preferredTime`   | `HH:mm:ss` → `HH:mm`; `""` if null     |

Each team appears at most once (deduplicated by `Team.id`).

---

## Error Responses

| Status | Condition                                            |
|--------|------------------------------------------------------|
| 400    | `eventId` absent or not a valid UUID                 |
| 400    | `format` present but not `xlsx` or `csv`             |
| 401    | No `Authorization` header / invalid token            |
| 403    | Valid token but user lacks `edit:competition`        |
| 404    | `eventId` is a valid UUID but no competition found   |
| 500    | Unexpected server error (should never occur normally)|

---

## TeamsService Contract

The service is format-agnostic. It returns:

```typescript
interface TeamsExportResult {
  headers: readonly string[];
  rows: (string | number | undefined | null)[][];
  eventName: string;
}
```

- `headers`: the 5 column headers listed above
- `rows`: one entry per unique team, already deduplicated and with
  `preferredDay` translated and `preferredTime` formatted
- `eventName`: used by the controller to build the `Content-Disposition` filename

The controller calls `toXlsx(sheetName, headers, rows)` or `toCSV(headers, rows)`
from `@badman/backend-utils` — no XLSX or CSV logic in the service.

---

## ExportController Contract (relevant route)

```typescript
@Get('teams')
async getTeams(
  @User() user: Player,
  @Res() res: FastifyReply,
  @Query() query: { eventId: string; format?: string }
)
```

Guard order:
1. Auth check (401 / 403)
2. `format` validation (400)
3. `eventId` UUID validation (400)
4. `EventCompetition.findByPk` existence check (404)
5. Call `TeamsService.getTeams(eventId)`
6. Serialise with `toXlsx` or `toCSV`
7. Set headers and send
