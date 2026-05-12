# Research: Locations Export

## 1. Single-Query Traversal — same EventEntry.findAll pattern

**Decision**: Use `EventEntry.findAll` with a nested `SubEventCompetition` `where`
clause, plus `Team → Club → Location → Availability` includes. Identical to
`ExceptionsService` (spec 010).

```typescript
const entries = await EventEntry.findAll({
  include: [
    {
      model: SubEventCompetition,
      attributes: [],
      where: { eventId },
      required: true,
    },
    {
      model: Team,
      required: false,
      include: [
        {
          model: Club,
          include: [
            {
              model: Location,
              include: [{ model: Availability }],
            },
          ],
        },
      ],
    },
  ],
});
```

**Rationale**: One SQL statement replaces the legacy three-level async loop chain.
Result is a flat `entries` array iterated once in memory.

---

## 2. Iterating `availability.days` — NOT NULL column, filter on `courts`

**Decision**: Iterate `availability.days ?? []` and include only entries where
`day.courts` is truthy (> 0). Entries with `courts` absent or zero are excluded,
matching the legacy Angular export.

**DB constraint**: The `days` column is `json NOT NULL` in the migration —
unlike `exceptions json` (nullable). At runtime after a Sequelize `include`,
`availability.days` will always be an array. The `?? []` guard is kept only for
TypeScript type safety (`days?:` is marked optional in the model).

**Why filter on `courts`**: A day entry with no courts set means the club has not
configured that slot for play — it should not appear in the export.

---

## 3. Address Assembly

**Decision**: Build the address string as:

```typescript
const address =
  [location.street, location.streetNumber, location.postalcode, location.city]
    .filter(Boolean)
    .join(" ") || location.address || "";
```

**Rationale**: Matches the legacy Angular implementation exactly. Falls back to
the raw `address` field if the structured fields are all absent.

---

## 4. Dutch Day Name Translation

**Decision**: Reuse the same `DAY_NAMES` constant already defined in `TeamsService`
(or a shared constant). Map `day.day` (e.g., `"monday"`) to its Dutch equivalent
(e.g., `"Maandag"`).

```typescript
const DAY_NAMES: Readonly<Record<string, string>> = {
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",
};
```

**Why Dutch day name in dedup key**: The dedup set uses the translated name
(`Maandag`) not the raw key (`monday`), so the key matches what appears in the
output column. This is consistent and avoids a mismatch if the same location has
two availability records both referencing Monday.

---

## 5. Deduplication Strategy

**Decision**: `Set<string>` with composite key `${clubId}|${locationName}|${dayName}`.

**Rationale**: O(1) per check; same approach as `ExceptionsService`. `clubId` is
a numeric federation ID, `locationName` is a human-readable string, `dayName` is
a Dutch weekday — none contain `|`.

---

## 6. Headers

**Decision**: `["Club ID", "Clubnaam", "Locatie", "Adres", "Dag", "Aantal Velden"]`

Taken directly from the legacy `ExcelService.getLocationsExport` output. 6 columns.

---

## 7. Permission — Confirmed Existing

**Confirmed**: `export-locations:competition` is already seeded by migration
`20250107000000-AddExportLocationsPermission.js`. No new migration needed.

**Auth check** (identical pattern to `getTeams` and `getExceptions`):
```typescript
if (!user?.id) throw new UnauthorizedException('Login required');
if (!(await user.hasAnyPermission(['export-locations:competition'])))
  throw new ForbiddenException('Insufficient permissions');
```

---

## 8. `days` vs `exceptions` nullability

| Column     | DB constraint | TS type      | Guard needed |
|------------|---------------|--------------|--------------|
| `exceptions` | `json` (nullable) | `exceptions?` | `?? []` required |
| `days`       | `json NOT NULL`   | `days?`       | `?? []` for TS only |

`availability.days` will never be `null` at runtime after a Sequelize include —
but the TypeScript type marks it optional, so `?? []` is used for type safety.

---

## 9. Test Strategy

Follow `exceptions.service.spec.ts` pattern exactly:

| Test case | What it verifies |
|-----------|-----------------|
| Returns 6 headers in correct order | Column schema |
| Returns `eventName` from competition | Filename derivation |
| Single day entry with courts → 1 row | Basic row output |
| Multiple day entries → correct row count | Iteration |
| Day entry with `courts = 0` → excluded | Courts filter |
| Day entry with `courts` absent → excluded | Courts filter (null/undefined) |
| Dedup: same `(clubId, locationName, day)` across two entries → 1 row | Composite key set |
| Dutch day name in `Dag` column | Day name translation |
| Address assembled from structured fields | Address builder |
| Address falls back to `address` field when structured fields absent | Address fallback |
| Club with no locations → skipped | Null safety |
| Entry with no team → skipped | Null safety |
| `NotFoundException` when event does not exist | Error propagation |
