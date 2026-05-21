# Research: Exceptions Export

## 1. Date Range Expansion — use `date-fns`

**Decision**: Use `eachDayOfInterval` from `date-fns` (already in `package.json` at `^4.1.0`).

**Rationale**: `date-fns` is already a project dependency. `eachDayOfInterval` is a clear,
named function that exactly models "one entry per calendar day from start to end inclusive".
No manual `while` loop or `setDate` arithmetic needed.

```typescript
import { eachDayOfInterval } from 'date-fns';

function expandException(start?: Date | string, end?: Date | string): Date[] {
  if (!start) return [];
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate   = end   ? (end instanceof Date ? end : new Date(end)) : startDate;
  return eachDayOfInterval({ start: startDate, end: endDate });
}
```

**Note on the `endDate` fallback**: when `end` is absent, `endDate` is set to `startDate`
(not a fresh `new Date()`) — this avoids a redundant allocation and makes the intent
clear: a missing `end` means "same day as start".

**Alternatives rejected**: Manual `while`/`setDate` loop (legacy approach, no need to
copy it), `moment` (already available but heavier; project is migrating away from it).

---

## 2. Date Formatting — Belgian Locale

**Decision**: Use `format` + `toZonedTime` from `date-fns-tz` (already in `package.json`
at `^3.2.0`).

```typescript
import { toZonedTime, format } from 'date-fns-tz';

const BRUSSELS_TZ = 'Europe/Brussels';

function formatBelgianDate(date: Date): string {
  return format(toZonedTime(date, BRUSSELS_TZ), 'dd/MM/yyyy', { timeZone: BRUSSELS_TZ });
}
```

**Rationale**: `date-fns-tz` is already available and provides explicit timezone-aware
formatting. The result is `DD/MM/YYYY` regardless of server locale.

**Alternatives rejected**: `toLocaleDateString('nl-BE', ...)` — works in Node 20 but
is locale-dependent and harder to test deterministically; `moment-timezone` — deprecated
direction for this project.

---

## 3. Single-Query Traversal — no nested async loops

**Decision**: Query `EventEntry.findAll` with a nested `SubEventCompetition` `where`
clause rather than iterating `getSubEventCompetitions()` → `getDrawCompetitions()` →
`getEventEntries()` in three separate async round-trips per level.

**Why it works**: `EventEntry` has a `subEventId` FK that points to `SubEventCompetition`,
which in turn has an `eventId` FK pointing to `EventCompetition`. Sequelize supports
`required: true` nested `where` to filter on a grand-parent's column via a JOIN.

```typescript
const entries = await EventEntry.findAll({
  include: [
    {
      model: SubEventCompetition,
      attributes: [],          // join only — no extra data needed
      where: { eventId },
      required: true,
    },
    {
      model: Team,
      required: false,
      include: [{
        model: Club,
        include: [{
          model: Location,
          include: [{ model: Availability }],
        }],
      }],
    },
  ],
});
```

**Outcome**: One SQL statement (with JOINs) replaces three nested layers of
sequential `await` calls. The result is a flat `entries` array that is iterated once
in memory — no `for (const draw of draws)` wrapping a second `await`.

**Why not used in `TeamsService` (spec 009)**: The teams service was written to
mirror the legacy Angular traversal pattern verbatim. The exceptions service takes
the improved approach. The teams service is not modified — out of scope.

---

## 4. Deduplication Strategy

**Decision**: `Set<string>` with composite key `${clubId}|${locationName}|${formattedDate}`.

**Rationale**: O(1) per check; trivially testable. The separator `|` avoids false
matches between e.g. `"club1|location"` and `date` vs `"club1"` and `"|location"` + date
(club IDs are numeric federation IDs, location names are human-readable strings — neither
contains `|`).

---

## 5. `Velden` Column

**Decision**: Map `exception.courts ?? ""` to the `Velden` column.

**Source**: `AvailabilityException` interface (`libs/backend/database/…/availability.model.ts`):
```typescript
export interface AvailabilityException {
  start?: Date;
  end?: Date;
  courts?: number;   // ← this field
}
```

**Legacy used `exception.courts || 0`** — spec 010 uses `""` for absent values,
consistent with the teams export empty-string convention.

---

## 6. Permission — Confirmed Existing

**Confirmed**: `export-exceptions:competition` is seeded by migration
`20250704200000-AddExportPermissions.js`. No new migration needed.

**Auth check** (identical pattern to `getTeams`):
```typescript
if (!user?.id) throw new UnauthorizedException('Login required');
if (!(await user.hasAnyPermission(['export-exceptions:competition'])))
  throw new ForbiddenException('Insufficient permissions');
```

---

## 7. Refactor `TeamsService` — Remove Nested Async Loops

**Decision**: Refactor `TeamsService.getTeams()` to use the same single-query approach
as `ExceptionsService` — `EventEntry.findAll` with a nested `SubEventCompetition` `where`
clause — removing the three-level `getSubEventCompetitions()` → `getDrawCompetitions()`
→ `getEventEntries()` async loop chain.

**Why**: Consistency between the two services. The teams query shape is simpler than
exceptions (no deep Club → Location → Availability include) so the refactor is
straightforward.

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
      include: [{ model: Club }],
    },
  ],
});
```

**Scope**: Refactor is in-scope for this feature branch. The existing
`teams.service.spec.ts` tests all still pass — the mocking changes from
`jest.spyOn(EventCompetition, 'findByPk')` + chained association mocks to
`jest.spyOn(EventEntry, 'findAll')`.

---

## 9. Service Registration Pattern

`ExceptionsService` is registered as a plain `@Injectable()` provider in
`AppModule.providers` and injected into `ExportController` via constructor — identical
to how `TeamsService` is wired. No new Nx lib or module file.

**`app.module.ts` changes**:
- `providers: [..., TeamsService, ExceptionsService]`
- `ExportController` constructor gains `private readonly exceptionsService: ExceptionsService`

---

## 10. Test Strategy

Follow `teams.service.spec.ts` exactly:

| Test case | What it verifies |
|---|---|
| Returns 5 headers in correct order | Column schema |
| Returns `eventName` from competition | Filename derivation |
| Single-day exception (no `end`) | `eachDayOfInterval` with `end = start` |
| Multi-day exception (e.g. 3 days) | Date range expansion correctness |
| Dedup: same `(clubId, locationName, date)` across two draws | Composite key set |
| Belgian date formatting — known date → `"25/12/2024"` | Locale output |
| Timezone correctness — UTC midnight stays correct under Brussels | TZ bug prevention |
| Empty exceptions array → headers-only output | Graceful empty state |
| Club with no locations → skipped | Null safety |
| `courts` absent → `""` in Velden | Empty-string convention |
| `NotFoundException` when event does not exist | Error propagation |
