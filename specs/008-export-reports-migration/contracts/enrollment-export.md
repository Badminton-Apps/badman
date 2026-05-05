# Contract: Enrollment Export Endpoint

## GET /excel/enrollment

Returns an XLSX file of all enrolled players for a competition.

### Authentication
Required — valid Auth0 JWT in `Authorization: Bearer <token>`.

### Authorization
User must hold the `edit:competition` permission.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventId` | UUID string | Yes | ID of the `EventCompetition` to export |

### Success Response — `200 OK`

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename={event.name}.xlsx
```

Binary XLSX body. Sheet name: `Enrollment`. 12 columns with autofilter and
auto-sized column widths (see data-model.md for exact column list).

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | `eventId` absent or not a valid UUID |
| `401` | No valid auth token |
| `403` | Authenticated but lacks `edit:competition` |
| `404` | `eventId` UUID matches no competition |
| `500` | XLSX generation failed |

---

# Contract: Shared Export Utility

**Module**: `@badman/backend-utils`
**File**: `libs/backend/utils/src/export.util.ts`

```typescript
type Row = (string | number | undefined | null)[]

// ── XLSX ────────────────────────────────────────────────────────────────────

/** Creates a new empty workbook. */
function createWorkbook(): XLSX.WorkBook

/**
 * Adds a sheet to the workbook.
 * - Builds sheet from [[...headers], ...rows] using aoa_to_sheet
 * - Auto-sizes each column: max content length across all rows + 2
 * - Sets !autofilter on the full sheet range
 * - Appends sheet under sheetName
 */
function addSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  headers: string[],
  rows: Row[]
): void

/** Writes workbook to a Node.js Buffer. */
function toXlsxBuffer(wb: XLSX.WorkBook): Buffer

// ── CSV (RFC 4180) ───────────────────────────────────────────────────────────

/**
 * Converts headers + rows to a CSV string.
 * - First line is the header row
 * - Separator: comma  |  Line ending: CRLF
 * - Values containing comma, double-quote, or newline are wrapped in double-quotes
 * - Double-quotes inside values are escaped as ""
 * - null / undefined values rendered as empty string
 */
function toCSV(headers: string[], rows: Row[]): string

/** Returns Buffer.from(toCSV(headers, rows), 'utf-8'). */
function toCSVBuffer(headers: string[], rows: Row[]): Buffer
```

All functions are **pure** (no I/O, no NestJS DI). Import directly wherever needed.
