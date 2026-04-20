# Settings API Guide (for frontend)

There are **two separate settings systems** in the GraphQL API. They share similar names but are completely independent.

---

## 1. Player Settings (personal, per-player)

These are personal notification/language preferences tied to a player account.

**Resolver:** `PlayerResolver` (in the player resolver, not a dedicated settings resolver)

### Query: get player settings

Player settings are accessed via the `player` or `me` query — the `setting` field on a `Player`:

```graphql
query GetPlayerSettings($id: ID!) {
  player(id: $id) {
    id
    setting {
      id
      language
      encounterChangeConfirmationNotification
      encounterChangeFinishedNotification
      encounterChangeNewNotification
      encounterNotAcceptedNotification
      encounterNotEnteredNotification
      syncSuccessNotification
      syncFailedNotification
      clubEnrollmentNotification
    }
  }
}
```

### Mutation: `updateSetting`

Updates a player's personal settings. Returns `Boolean`.

```graphql
mutation UpdatePlayerSetting(
  $playerId: ID!
  $language: String!
  $encounterChangeConfirmationNotification: Int!
  # ... other notification fields
) {
  updateSetting(
    settings: {
      playerId: $playerId
      language: $language
      encounterChangeConfirmationNotification: $encounterChangeConfirmationNotification
      # ...
    }
  )
}
```

- Argument name: `settings` (type: `SettingUpdateInput`)
- Returns: `Boolean` (true on success)
- No special permissions required — uses `playerId` to find the player
- Creates the Setting record if it doesn't exist yet

**This mutation name has NOT changed.**

---

## 2. Admin Settings (system-wide, key-based)

These are system-level settings managed by admins. Currently used for enrollment configuration, but designed to be generic/extensible for any future admin-controlled settings.

**Resolver:** `SettingResolver` (dedicated resolver)

### What changed

Previously there was a dedicated `EnrollmentSetting` model with fixed fields (`enrollmentOpen`, `openDate`, `closeDate`). This has been **generalized** into a generic `AdminSetting` model.

| Old (removed)                | New                         |
| ---------------------------- | --------------------------- |
| `enrollmentSetting` query    | `adminSetting(key: "...")` query |
| `updateEnrollmentSetting`    | `updateAdminSetting`        |
| `EnrollmentSetting` type     | `AdminSetting` type         |
| `EnrollmentSettingUpdateInput` | `AdminSettingUpdateInput`  |

### Query: `adminSetting`

Get a single admin setting by key:

```graphql
query GetAdminSetting($key: String!) {
  adminSetting(key: $key) {
    id
    key
    description
    enabled
    startDate
    endDate
  }
}
```

For enrollment specifically:
```graphql
query GetEnrollmentSetting {
  adminSetting(key: "enrollment") {
    id
    key
    enabled       # replaces old enrollmentOpen
    startDate     # replaces old openDate
    endDate       # replaces old closeDate
    description
  }
}
```

### Query: `adminSettings`

Get all admin settings:

```graphql
query GetAllAdminSettings {
  adminSettings {
    id
    key
    enabled
    startDate
    endDate
    description
  }
}
```

### Mutation: `updateAdminSetting`

Update an admin setting. Returns the updated `AdminSetting`.

```graphql
mutation UpdateAdminSetting($data: AdminSettingUpdateInput!) {
  updateAdminSetting(data: $data) {
    id
    key
    enabled
    startDate
    endDate
    description
  }
}
```

**Variables:**
```json
{
  "data": {
    "id": "<setting-uuid>",
    "enabled": true,
    "startDate": "2026-04-01",
    "endDate": "2026-05-01",
    "description": "Enrollment period for 2026-2027 season"
  }
}
```

- Argument name: `data` (type: `AdminSettingUpdateInput`)
- Returns: `AdminSetting`
- Requires admin permission based on the setting key (e.g., `change:enrollment` for the enrollment setting)
- The `key` field cannot be changed via update — it's set at creation

### AdminSetting fields

| Field         | Type      | Notes                              |
| ------------- | --------- | ---------------------------------- |
| `id`          | `UUID`    | Primary key                        |
| `key`         | `String`  | Unique identifier (e.g. `"enrollment"`) |
| `description` | `String?` | Optional description               |
| `enabled`     | `Boolean` | Default: `false`                   |
| `startDate`   | `Date?`   | Optional start date                |
| `endDate`     | `Date?`   | Optional end date                  |

### Permission mapping

Each setting key maps to required permissions:

| Setting key    | Required permission    |
| -------------- | ---------------------- |
| `enrollment`   | `change:enrollment`    |

New setting keys + permissions can be added in the backend as needed.

---

## Summary of GraphQL operations

| Operation             | Type     | Purpose                    | Returns        |
| --------------------- | -------- | -------------------------- | -------------- |
| `player.setting`      | Field    | Player's personal settings | `Setting`      |
| `updateSetting`       | Mutation | Update player settings     | `Boolean`      |
| `adminSetting(key:)`  | Query    | Get one admin setting      | `AdminSetting?`|
| `adminSettings`       | Query    | Get all admin settings     | `[AdminSetting]`|
| `updateAdminSetting`  | Mutation | Update an admin setting    | `AdminSetting` |
