# Admin Settings — Frontend Implementation Guide

> Backend branch: `feat/enrollment-settings`
> Frontend stack: Next.js 15, React 19, MUI, Apollo GraphQL

---

## Backend Summary

### Database

Table `system."Settings"` — one row per setting, identified by a unique `key`. The `enrollment` row is seeded by migration.

| Column      | Type     | Notes                              |
| ----------- | -------- | ---------------------------------- |
| `id`        | UUID     | PK, auto-generated                 |
| `key`       | STRING   | Unique identifier (e.g. `enrollment`) |
| `description` | STRING | nullable, human-readable label     |
| `enabled`   | BOOLEAN  | default `false`                    |
| `startDate` | DATEONLY | nullable                           |
| `endDate`   | DATEONLY | nullable                           |
| `meta`      | JSONB    | nullable, not exposed to GraphQL   |
| `createdAt` | DATE     | timestamp                          |
| `updatedAt` | DATE     | timestamp                          |

### Permission

Claim: **`change:enrollment`** (type: `global`, category: `enrollment`).
Created by migration `20260320000000-create_settings.js`.

Permissions are per-setting key. Future settings will add their own claims.

### GraphQL API

**Query — get one setting by key** (public, no auth required):

```graphql
query Setting($key: String!) {
  setting(key: $key) {
    id
    key
    description
    enabled
    startDate
    endDate
    updatedAt
  }
}
```

Returns `Setting | null`.

**Query — get all settings** (public, no auth required):

```graphql
query Settings {
  settings {
    id
    key
    description
    enabled
    startDate
    endDate
  }
}
```

**Mutation** — requires the appropriate permission for the setting's key (e.g. `change:enrollment`):

```graphql
mutation UpdateSetting($data: AdminSettingUpdateInput!) {
  updateSetting(data: $data) {
    id
    key
    enabled
    startDate
    endDate
    updatedAt
  }
}
```

The `$data` input **must include `id`** (UUID of the existing row) plus whichever fields are being changed. `key` is immutable and cannot be set via mutation.

Error responses:
- `UnauthorizedException` — user lacks the required permission for that setting
- `NotFoundException` — setting not found or no permissions configured for its key

### Field mapping from old API

| Old field        | New field   |
| ---------------- | ----------- |
| `enrollmentOpen` | `enabled`   |
| `openDate`       | `startDate` |
| `closeDate`      | `endDate`   |

Old queries (`enrollmentSetting`, `updateEnrollmentSetting`) have been replaced. Use `setting(key: "enrollment")` and `updateSetting` instead.

---

## Frontend Implementation

### 1. Sidebar Navigation

Add an entry using translation key `all.v1.shell.sidebar.pages.adminSettings`.

- **Only visible** to users with the `change:enrollment` claim (expand to other claims as more settings are added)
- Route suggestion: `/admin/settings` (with sub-sections per setting)

### 2. Route Protection

Gate the page so unauthorized users cannot access it directly. Either redirect to home/login or show a 403 message.

### 3. Page UI

```
┌─────────────────────────────────────────────────┐
│  Admin Settings                                 │
│                                                 │
│  Enrollment                                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Enabled           [toggle switch]        │  │
│  │                                           │  │
│  │  Start Date        [date picker]          │  │
│  │                                           │  │
│  │  End Date          [date picker]          │  │
│  │                                           │  │
│  │              [Save Button]                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

MUI components:
- `Switch` for `enabled`
- `DatePicker` for `startDate` / `endDate` — date-only, no time
- `Button` for save
- `Snackbar`/`Alert` for success/error feedback

### 4. Workflow

1. Page loads → execute `setting(key: "enrollment")` query → populate form
2. User toggles/edits fields
3. User clicks Save → execute `updateSetting` mutation with `{ id, enabled, startDate, endDate }`
4. On success → show confirmation snackbar, update Apollo cache
5. On error → show error snackbar

---

## Things to Watch Out For

- **Date format**: `startDate`/`endDate` are `DATEONLY` — send as `YYYY-MM-DD` strings, not full ISO datetimes
- **`id` is required in mutation input** — include it from the query result
- **`key` is immutable** — cannot be changed via the mutation
- **No create mutation** — settings rows are seeded by migrations. Only update exists
- **Cache invalidation**: After mutation, invalidate/update the Apollo cache for `setting` so other parts of the app see the new values
- **Permission check on frontend**: Gate both the sidebar link and the page itself behind the appropriate claims
