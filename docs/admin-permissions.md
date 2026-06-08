# Admin Permissions Playbook

How to manually grant or revoke permissions for a user directly in the database. Useful for local development, testing, and production incidents.

## Schema overview

```
"Players"                              — player records (identified by email)
security."Claims"                      — available permission claims
security."PlayerClaimMemberships"      — junction: which player has which claim
security."Roles"                       — entity-scoped or global role containers
security."PlayerRoleMemberships"       — junction: which player has which role
security."RoleClaimMemberships"        — junction: which role has which claim
```

Claims have a `type` of `global`, `club`, `team`, `competition`, or `tournament`.

---

## Step 1 — Find the player

```sql
SELECT id, email, "firstName", "lastName"
FROM "Players"
WHERE email = 'user@example.com';
```

---

## Step 2 — See what claims exist

### All global claims (system-wide admin permissions)

```sql
SELECT id, name, description
FROM security."Claims"
WHERE LOWER(type) = 'global'
ORDER BY name;
```

### All claims by type

```sql
SELECT id, name, type, description
FROM security."Claims"
ORDER BY type, name;
```

Known claim names as of 2026-06-08:

| Name                              | Type   | Purpose                               |
| --------------------------------- | ------ | ------------------------------------- |
| `add:faq`                         | global | Add FAQ entries                       |
| `add:club`                        | global | Add a new club                        |
| `change:enrollment`               | global | Open/close enrollment settings        |
| `change:rules`                    | global | Edit ranking rules                    |
| `change:transfer`                 | global | Accept/reject player transfers        |
| `edit:faq`                        | global | Edit FAQ content                      |
| `edit:ranking`                    | global | Edit ranking configuration            |
| `edit:state`                      | global | Edit province/state data              |
| `edit:system-settings`            | global | Edit system settings                  |
| `enlist-any-event:team`           | global | Enlist any team into any event        |
| `export-exceptions:competition`   | global | Export competition exceptions         |
| `export-locations:competition`    | global | Export competition locations          |
| `export-planner:competition`      | global | Export competition planner            |
| `export-teams:competition`        | global | Export competition teams              |
| `re-sync:points`                  | global | Re-sync ranking points                |
| `sync:competition`                | global | Sync competition data                 |
| `sync:tournament`                 | global | Sync tournament data                  |
| `view-any:enrollment-competition` | global | View any club's enrollment            |
| `view-any:enrollment-tournament`  | global | View any club's tournament enrollment |
| `edit:club`                       | club   | Edit own club                         |
| `edit-any:club`                   | club   | Edit any club                         |
| `edit:location`                   | club   | Edit locations in own club            |
| `view:enrollment-competition`     | club   | View own club's enrollment            |
| `view:enrollment-tournament`      | club   | View own club's tournament enrollment |

> Always run the query above to get the current list — new claims are added via migrations and may not appear here.

---

## Step 3 — See what a user currently has

### By player UUID

```sql
SELECT c.name, c.type, c.description
FROM security."PlayerClaimMemberships" pcm
JOIN security."Claims" c ON c.id = pcm."claimId"
WHERE pcm."playerId" = '<player-uuid>'
ORDER BY c.type, c.name;
```

### By email (convenience)

```sql
SELECT c.name, c.type, c.description
FROM security."PlayerClaimMemberships" pcm
JOIN "Players" p ON p.id = pcm."playerId"
JOIN security."Claims" c ON c.id = pcm."claimId"
WHERE p.email = 'user@example.com'
ORDER BY c.type, c.name;
```

---

## Step 4 — Grant a permission

### Grant a specific claim (by player UUID)

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE name = 'change:enrollment'
ON CONFLICT DO NOTHING;
```

### Grant a specific claim (by email)

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT p.id, c.id, NOW(), NOW()
FROM "Players" p
CROSS JOIN security."Claims" c
WHERE p.email = 'user@example.com'
  AND c.name = 'change:enrollment'
ON CONFLICT DO NOTHING;
```

### Grant all global claims (full admin, by player UUID)

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE LOWER(type) = 'global'
ON CONFLICT DO NOTHING;
```

### Grant all global claims (full admin, by email)

```sql
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT p.id, c.id, NOW(), NOW()
FROM "Players" p
CROSS JOIN security."Claims" c
WHERE p.email = 'user@example.com'
  AND LOWER(c.type) = 'global'
ON CONFLICT DO NOTHING;
```

> `ON CONFLICT DO NOTHING` makes all grant queries safe to run multiple times.

---

## Step 5 — Revoke a permission

### Revoke a specific claim (by player UUID)

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = '<player-uuid>'
  AND "claimId" = (SELECT id FROM security."Claims" WHERE name = 'change:enrollment');
```

### Revoke a specific claim (by email)

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = (SELECT id FROM "Players" WHERE email = 'user@example.com')
  AND "claimId" = (SELECT id FROM security."Claims" WHERE name = 'change:enrollment');
```

### Revoke all global claims from a user (by email)

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = (SELECT id FROM "Players" WHERE email = 'user@example.com')
  AND "claimId" IN (SELECT id FROM security."Claims" WHERE LOWER(type) = 'global');
```

### Revoke all claims from a user

```sql
DELETE FROM security."PlayerClaimMemberships"
WHERE "playerId" = '<player-uuid>';
```

---

## Full example: make a user a global admin

```sql
-- 1. Find the player
SELECT id, email FROM "Players" WHERE email = 'user@example.com';

-- 2. Grant all global claims (replace the UUID)
INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
SELECT '<player-uuid>', id, NOW(), NOW()
FROM security."Claims"
WHERE LOWER(type) = 'global'
ON CONFLICT DO NOTHING;

-- 3. Verify
SELECT c.name FROM security."PlayerClaimMemberships" pcm
JOIN security."Claims" c ON c.id = pcm."claimId"
WHERE pcm."playerId" = '<player-uuid>'
ORDER BY c.name;
```

---

## Automation

To grant all global claims to the configured admin user in a fresh environment:

```bash
npm run seed:admin
```

---

## Notes

- Permissions take effect immediately — no restart needed.
- `PlayerClaimMemberships` has no `clubId` column. Club-scoped claims (`type = 'club'`) are granted globally to the player — the app resolves club context from club membership via `Role.linkId`.
- The in-process permission cache (`_cachedPermissions` on the Player model) is not invalidated when claims change in the DB. Changes apply on next request that loads a fresh Player instance.

---

## Architecture Audit

### How it works end-to-end

1. `PermGuard` (global `APP_GUARD`) validates the Bearer JWT via Auth0 JWKS and loads the `Player` row. Does **not** block requests without a token — access control is entirely deferred to resolvers.
2. The `@User()` decorator extracts `request.user`. If the DB lookup failed, returns a stub with `hasAnyPermission: () => false`.
3. Resolver calls `await user.hasAnyPermission([...])` — a simple `Array.includes` over a flat string array.
4. That array is built by `getPermissions()` on the Player model:
   - Direct claims → their `.name` verbatim (e.g. `"edit:claims"`)
   - Role claims → prefixed with the role's `linkId` (e.g. `"<club-uuid>_edit:club"`)
   - Cached in `_cachedPermissions` for the lifetime of the Player instance.

Permission string conventions:

| Pattern                | Example              | Meaning                              |
| ---------------------- | -------------------- | ------------------------------------ |
| `verb:resource`        | `edit:claims`        | Global                               |
| `<uuid>_verb:resource` | `<clubId>_edit:club` | Scoped to specific entity            |
| `verb-any:resource`    | `edit-any:club`      | Override for any entity of that type |

### Issues

#### 🔴 Critical

**No permission name constants.**
Claim strings are hardcoded across ~30 resolver files (`"edit:claims"`, `"edit:ranking"`, `"change:enrollment"`, …). A typo silently grants no access with no error. A single `permissions.ts` constants file would catch this at compile time.

**`canExecute` utility exists but is never used.**
`libs/backend/graphql/src/utils/can-exexcute.ts` defines a structured permission-check helper. Zero imports. Every resolver re-implements the same inline `if (!(await user.hasAnyPermission([...]))) throw new UnauthorizedException(...)` pattern. Either adopt it everywhere or delete it.

**Dev mode grants all permissions automatically.**
`libs/backend/authorization/src/decorators/user.decorator.ts:16`:

```typescript
hasAnyPermission: () => env["NODE_ENV"] === "development" || false;
```

If `NODE_ENV` is misconfigured in a staging/production deployment, every unauthenticated request becomes superuser. Should be removed; use explicit permission mocking in tests instead.

#### 🟡 Moderate

**Permission cache never invalidated.**
`_cachedPermissions` is a Promise stored on the Player instance with no TTL and no event-based flush. If a role or claim is changed in the DB mid-session, the player retains stale permissions until a fresh Player is loaded. Fix: clear `_cachedPermissions` in the claim/role mutation resolvers after commit, or add a short TTL.

**`Role.locked` is not enforced.**
The field exists (`role.model.ts:73`) but is never checked before `deleteRole` or `updateRole`. It was presumably intended to protect system roles. Currently has no effect.

**Inconsistent fallback patterns.**
Some resolvers check `[scoped, edit-any:X]` (correct), others check only the scoped form (incomplete). `claim.resolver.ts` has no `edit-any` fallback at all. No documented rule for when a global override should exist.

**Frontend wildcard matching, backend has none.**
`libs/frontend/modules/auth/src/services/claims.service.ts:73` supports `"edit:*"` via partial string match. `hasAnyPermission` on the backend is exact-string only. The two systems diverge silently — a frontend check that passes may not correspond to any real backend permission.

**`null_edit:club` string can be assembled.**
`player.model.ts:348`: `` `${r.linkId}_${c.name}` `` — if `linkId` is null (a global role with a claim), this produces the string `"null_edit:club"`. It gets filtered out before being returned, but the construction is wrong. Global roles should be detected by `linkType === 'global'` and their claims added unprefixed.

**No audit log.**
Claim grants and role assignments have no history beyond `createdAt`/`updatedAt` on join tables. There is no way to answer "who granted this permission, and when?"

#### 🟢 Minor

**`Claim.category` is unused.** It is part of the unique constraint `(name, category, type)` but is never queried or used for grouping. Dead schema weight.

**Backwards-compat seeder code should be a migration.**
`database/seeders/utils/permissions.ts` — `ensureRole()` checks at runtime whether the old `clubId` column exists. This belongs in a one-time migration, not in code that runs on every seed.

**Mixed null-check patterns before permission calls.**
Some resolvers: `if (!user || !(await user.hasAnyPermission(...)))`. Others assume `user` is always defined. No consistent guard contract.

---

### Recommendations

Priority order — each item is independent and can be done in isolation.

#### 1. Centralize claim name constants (Low effort, High value)

Create `libs/backend/authorization/src/permissions.ts` (or `libs/backend/database/src/models/security/permissions.ts`) with a plain const object:

```typescript
export const Permission = {
  EDIT_CLAIMS: "edit:claims",
  CHANGE_ENROLLMENT: "change:enrollment",
  EDIT_ANY_CLUB: "edit-any:club",
  // ...
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
```

All resolvers import from here. Typos become compile errors.

#### 2. Wire up or delete `canExecute` (Low effort)

`libs/backend/graphql/src/utils/can-exexcute.ts` already exists. Either:

- Adopt it in all resolvers (replace ~30 inline checks), or
- Delete it (it's dead code creating confusion).

If adopted, it becomes the single place to add future cross-cutting concerns (logging, rate limiting, audit trail).

#### 3. Fix `null_edit:club` — skip global roles in prefix (Low effort)

```typescript
// player.model.ts getPermissions()
const scopedClaims = roles.flatMap(
  (role) =>
    role.linkType === "global"
      ? role.Claims.map((c) => c.name) // global role: no prefix
      : role.Claims.map((c) => `${role.linkId}_${c.name}`) // scoped role: prefix
);
```

#### 4. Remove dev auto-grant (Low effort)

Delete the `NODE_ENV === "development"` shortcut in `user.decorator.ts`. In tests, pass a mock Player with explicit `hasAnyPermission` stubs. This is what the resolver test convention already does.

#### 5. Enforce `Role.locked` (Low effort)

In `role.resolver.ts`, before any write:

```typescript
if (role.locked) throw new BadRequestException("Cannot modify a locked role");
```

#### 6. Document and enforce the `edit-any` fallback rule (Medium effort)

Decide the rule (e.g. _every entity-scoped check must also accept the corresponding `verb-any:resource` global_), document it in this file, and audit all resolvers for compliance. Likely a one-day pass across the resolver directory.

#### 7. Add permission cache invalidation (Medium effort)

After a successful claim or role mutation commit, clear `_cachedPermissions` on any in-scope Player instances — or simply nullify it per-request (cache within one request only, not across requests). The per-request approach is safest and requires only moving the cache from the model instance to the GraphQL context.

#### 8. Add basic audit logging (Medium effort)

In `claim.resolver.ts` and `role.resolver.ts`, after each write, emit a structured log line:

```
[permission-change] actor=<actorId> action=grant|revoke target=<playerId> claim=<name>
```

No schema changes needed — logging only. A database audit table is a larger follow-up.

#### 9. Resolve frontend/backend wildcard mismatch (Medium effort)

Pick one:

- Add wildcard matching to `hasAnyPermission` on the backend (`edit:*` matches any `edit:X`), or
- Remove wildcard usage from the frontend and use explicit permission names everywhere.

The backend-side fix is ~10 lines; the frontend audit is the bigger task.
