# Enrollment Settings — Frontend Implementation Guide

> Backend branch: `feat/enrollment-settings`
> Frontend stack: Next.js 15, React 19, MUI, Apollo GraphQL

---

## Backend Summary

### Database

Table `system."EnrollmentSettings"` — singleton (one row, seeded by migration).

| Column           | Type     | Notes              |
| ---------------- | -------- | ------------------ |
| `id`             | UUID     | PK, auto-generated |
| `enrollmentOpen` | BOOLEAN  | default `false`    |
| `openDate`       | DATEONLY | nullable           |
| `closeDate`      | DATEONLY | nullable           |
| `createdAt`      | DATE     | timestamp          |
| `updatedAt`      | DATE     | timestamp          |

### Permission

Claim: **`change:enrollment`** (type: `global`, category: `enrollment`).
Created by migration `20260320000000-create_enrollment_settings.js`.

### GraphQL API

**Query** — public, no auth required:

```graphql
query EnrollmentSetting {
  enrollmentSetting {
    id
    enrollmentOpen
    openDate
    closeDate
    updatedAt
  }
}
```

Returns `EnrollmentSetting | null`. Should always return data (migration seeds one row).

**Mutation** — requires `change:enrollment` permission:

```graphql
mutation UpdateEnrollmentSetting($data: EnrollmentSettingUpdateInput!) {
  updateEnrollmentSetting(data: $data) {
    id
    enrollmentOpen
    openDate
    closeDate
    updatedAt
  }
}
```

The `$data` input **must include `id`** (UUID of the existing row) plus whichever fields are being changed. All fields except `id` are optional.

Error responses:
- `UnauthorizedException` — user lacks `change:enrollment`
- `NotFoundException` — no settings row exists (should not happen)

---

## Frontend Implementation

### 1. Sidebar Navigation

Add an entry using translation key `all.v1.shell.sidebar.pages.adminSettings`.

- **Only visible** to users with the `change:enrollment` claim
- Route suggestion: `/admin/settings/enrollment` (or wherever admin settings live)

### 2. Route Protection

Gate the page so unauthorized users cannot access it directly. Either redirect to home/login or show a 403 message.

### 3. Page UI

```
┌─────────────────────────────────────────────────┐
│  Admin Settings                                 │
│                                                 │
│  Enrollment                                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Enrollment Open    [toggle switch]       │  │
│  │                                           │  │
│  │  Open Date          [date picker]         │  │
│  │                                           │  │
│  │  Close Date         [date picker]         │  │
│  │                                           │  │
│  │              [Save Button]                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

MUI components:
- `Switch` for `enrollmentOpen`
- `DatePicker` for `openDate` / `closeDate` — date-only, no time
- `Button` for save
- `Snackbar`/`Alert` for success/error feedback

### 4. Workflow

1. Page loads → execute `EnrollmentSetting` query → populate form
2. User toggles/edits fields
3. User clicks Save → execute `UpdateEnrollmentSetting` mutation with `{ id, enrollmentOpen, openDate, closeDate }`
4. On success → show confirmation snackbar, update Apollo cache
5. On error → show error snackbar

---

## Things to Watch Out For

- **Date format**: `openDate`/`closeDate` are `DATEONLY` — send as `YYYY-MM-DD` strings, not full ISO datetimes
- **Singleton**: There's always exactly one row. Query returns a single object, not a list
- **`id` is required in mutation input** — include it from the query result
- **No create mutation** — the migration seeds the row. Only update exists
- **Cache invalidation**: After mutation, invalidate/update the Apollo cache for `enrollmentSetting` so other parts of the app see the new values
- **Permission check on frontend**: Gate both the sidebar link and the page itself behind `change:enrollment`
