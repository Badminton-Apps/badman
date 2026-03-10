# Moment → date-fns Migration Plan

**Scope:** `apps/worker/sync` only
**Branch:** `chore/moment-to-date-fns`
**Packages to install:** `date-fns`, `date-fns-tz`
**Packages to remove (after migration):** `moment`, `moment-timezone` (check if used elsewhere in monorepo first)

---

## 1. Packages

```bash
npm install date-fns date-fns-tz
# Remove only after full migration across monorepo:
# npm uninstall moment moment-timezone
```

> **Pitfall:** `moment` and `moment-timezone` are likely used in other `apps/` and `libs/`. Do not uninstall them from the monorepo root until all usages are migrated. Only the imports in `apps/worker/sync` are in scope here.

---

## 2. API Cheat Sheet

| Moment pattern | date-fns equivalent |
|---|---|
| `moment()` | `new Date()` |
| `moment(str)` | `new Date(str)` |
| `moment(str, "YYYY-MM-DD")` | `parse(str, "yyyy-MM-dd", new Date())` |
| `moment(str, "HH:mm")` | `parse(str, "HH:mm", new Date())` |
| `moment(str, "D-M-YYYY HH:mm")` | `parse(str, "d-M-yyyy HH:mm", new Date())` |
| `moment([year, month, day])` | `new Date(year, month, day)` |
| `moment.tz(str, tz)` | `toZonedTime(new Date(str), tz)` *(see §4)* |
| `.subtract(n, "days")` | `subDays(date, n)` |
| `.subtract(n, "hours")` | `subHours(date, n)` |
| `.subtract(n, "weeks")` | `subWeeks(date, n)` |
| `.subtract(n, "months")` | `subMonths(date, n)` |
| `.subtract(n, "minutes")` | `subMinutes(date, n)` |
| `.add(n, "days")` | `addDays(date, n)` |
| `.add(n, "hours")` | `addHours(date, n)` |
| `.add(n, "weeks")` | `addWeeks(date, n)` |
| `.add(n, "months")` | `addMonths(date, n)` |
| `.add(n, "minutes")` | `addMinutes(date, n)` |
| `.diff(other, "hours")` | `differenceInHours(date, other)` |
| `.diff(other, "days")` | `differenceInDays(date, other)` |
| `.diff(other)` (ms) | `differenceInMilliseconds(date, other)` |
| `.isBefore(other)` | `isBefore(date, other)` |
| `.isAfter(other)` | `isAfter(date, other)` |
| `.isSameOrAfter(other)` | `!isBefore(date, other)` |
| `.isSameOrBefore(other)` | `!isAfter(date, other)` |
| `.isSame(other)` | `isEqual(date, other)` or `isSameDay(date, other)` |
| `.isBetween(a, b)` | `isAfter(date, a) && isBefore(date, b)` |
| `.isValid()` | `isValid(date)` |
| `.format("YYYY-MM-DD")` | `format(date, "yyyy-MM-dd")` |
| `.format("HH:mm")` | `format(date, "HH:mm")` |
| `.format("YYYY-MM-DD HH:mm")` | `format(date, "yyyy-MM-dd HH:mm")` |
| `.format("dddd")` | `format(date, "EEEE")` (full day name) |
| `.format("LLL")` | `format(date, "PPpp")` *(locale-sensitive, see §5)* |
| `.month()` | `getMonth(date)` (0-indexed, same) |
| `.year()` | `getFullYear(date)` |
| `.hour()` | `getHours(date)` |
| `.minute()` | `getMinutes(date)` |
| `.date(n)` (setter) | `setDate(date, n)` |
| `.day(n)` (setter) | `setDay(date, n, { weekStartsOn: 0 })` |
| `.toDate()` | already a `Date`, no-op |
| `.toISOString()` | `date.toISOString()` |
| `.valueOf()` | `date.getTime()` |
| `.clone()` | `new Date(date)` or just pass to pure fn |
| `Moment` type | `Date` |

---

## 3. File-by-File Migration Tasks

### Simple (straightforward replacements)

| File | Operations |
|---|---|
| `processors/change-date/change-date.ts` | `tz + format` |
| `processors/sync-events/competition-sync/processors/game.ts` | `isAfter`, `isBefore`, `subWeeks` |
| `processors/sync-events/tournament-sync/processors/game.ts` | `isBefore`, `subWeeks`, `tz + toDate` |
| `processors/sync-events/competition-sync/processors/encounter.ts` | `isAfter`, `tz + toDate` |
| `processors/sync-events/tournament-sync/processors/draw.ts` | `isBefore`, `subMonths` |
| `processors/sync-events/tournament-sync/processors/subEvent.ts` | `isBefore`, `subMonths` |
| `processors/sync-events/competition-sync/processors/subEvent.ts` | `isBefore` |
| `processors/sync-events-v2/competition/processors/game.processor.ts` | `tz + toDate` |
| `processors/sync-events-v2/tournament/processors/game.processor.ts` | `tz + toDate` |
| `processors/sync-events/competition-sync/processors/entry.ts` | `new Date(season, 8, 1)`, `isBefore` |
| `processors/sync-events/competition-sync/processors/event.ts` | `getFullYear`, `differenceInDays` |
| `processors/sync-events-v2/competition/processors/event.processor.ts` | `getFullYear`, `differenceInDays` |
| `processors/sync-events/sync-events.processor.ts` | `getTime` for sort, `!isBefore` |
| `processors/check-encounters/check-encounters.processor.ts` | `subDays`, parse, `isValid`, `differenceInHours` |
| `processors/check-encounters/guards.ts` + its test | `differenceInHours`, `addHours`, `isSameOrBefore` |

### Moderate

**`processors/sync-events/competition-sync/processors/encounter-location.ts`**
Uses `clone().set({hour, minute})` and `isBetween`. Replace with:
```typescript
import { format, getHours, getMinutes, parse, setHours, setMinutes, isAfter, isBefore, addMinutes, subMinutes } from "date-fns";

const encounterDate = new Date(encounter.encounter.date);
// format day name
format(encounterDate, "EEEE").toLowerCase()
// clone and set time
const parsed = parse(day.startTime, "HH:mm", new Date());
const startTime = setMinutes(setHours(new Date(encounterDate), getHours(parsed)), getMinutes(parsed));
// isBetween
isAfter(encounterDate, subMinutes(startTime, 15)) && isBefore(encounterDate, addMinutes(startTime, 15))
```

**`processors/sync-events/tournament-sync/processors/event.ts`** and **`sync-events-v2/tournament/processors/event.processor.ts`**
Use `Moment[]` type + mutable `add(1, "days")` in a loop. Replace with:
```typescript
import { addDays, differenceInDays } from "date-fns";

const dates: Date[] = [];
let date = new Date(startDate);
const dayCount = differenceInDays(new Date(endDate), date);
for (let i = 0; i <= dayCount; i++) {
  dates.push(new Date(date));
  date = addDays(date, 1);
}
```

### Complex

**`processors/sync-ranking/ranking-sync.ts`**
This is the most involved file. Key issues:
1. `VisualPublication.date` is typed as `Moment` — must be changed to `Date`.
2. All call sites using `.date.diff()`, `.date.toDate()`, `.date.isAfter()`, `.date.isBefore()`, `.date.format()` must be updated.
3. The "first Monday of month" calculation:
   ```typescript
   // moment:
   const firstMondayOfMonth = momentDate.clone().date(1).day(8);
   if (firstMondayOfMonth.date() > 7) firstMondayOfMonth.day(-6);
   ```
   Replace with date-fns:
   ```typescript
   import { setDate, getDay, addDays, subDays, getDate } from "date-fns";

   function getFirstMondayOfMonth(date: Date): Date {
     const firstOfMonth = setDate(new Date(date), 1);
     const dayOfWeek = getDay(firstOfMonth); // 0=Sun, 1=Mon...
     const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
     return addDays(firstOfMonth, daysUntilMonday);
   }
   ```
4. `format("LLL")` — locale long format. See §5.

---

## 4. Timezone Pitfalls

### moment-timezone vs date-fns-tz

`moment.tz(str, "Europe/Brussels").toDate()` parses a datetime string **as if it were in Brussels time** and returns a UTC `Date`. The equivalent in date-fns-tz:

```typescript
import { fromZonedTime } from "date-fns-tz";

// moment.tz("2024-10-05 14:00", "Europe/Brussels").toDate()
fromZonedTime("2024-10-05 14:00", "Europe/Brussels");
```

> **Pitfall:** `date-fns-tz` v3 renamed `zonedTimeToUtc` → `fromZonedTime` and `utcToZonedTime` → `toZonedTime`. Verify the installed version and use the correct API.

### Formatting in timezone

`moment(date).tz("Europe/Brussels").format(fmt)` renders the time in Brussels local time. Equivalent:
```typescript
import { formatInTimeZone } from "date-fns-tz";
formatInTimeZone(date, "Europe/Brussels", "yyyy-MM-dd HH:mm");
```

---

## 5. Locale / `format("LLL")` Pitfall

Moment's `"LLL"` is a locale-sensitive format (e.g. "March 9, 2026 3:45 PM" in en). date-fns uses `PPpp` for a similar output but **requires an explicit locale import**:

```typescript
import { format } from "date-fns";
import { nl } from "date-fns/locale";

format(date, "PPpp", { locale: nl }); // Belgian Dutch
```

`ranking-sync.ts` calls `.format("LLL")` in three places (lines 227, 281, 454). These are used for log messages only — so `PPpp` with a locale, or even just `.toLocaleString()`, is acceptable.

---

## 6. Other Pitfalls

| Pitfall | Detail |
|---|---|
| **Format string case** | Moment uses `YYYY/DD`, date-fns uses `yyyy/dd`. Easy to miss. |
| **Month 0-indexing** | Both moment and date-fns use 0-based months — no change needed. |
| **Mutability** | Moment objects are mutable (`.add()` mutates in place). date-fns functions return new `Date` objects — don't rely on mutation. |
| **`isBetween` exclusivity** | `moment.isBetween(a, b)` excludes endpoints by default. The replacement `isAfter(d, a) && isBefore(d, b)` behaves the same. |
| **`isSame` semantics** | `moment.isSame(other)` compares milliseconds. `isEqual(a, b)` from date-fns does too. `isSameDay` compares only the calendar day — use the right one. |
| **`diff` sign** | `moment(a).diff(b)` = `a - b`. `differenceInHours(a, b)` = `a - b`. Same sign convention. |
| **`isValid` on null/undefined** | `moment(undefined).isValid()` returns `false`. `isValid(new Date(undefined))` returns `false`. Same behavior, but `isValid(null)` — wrap in `new Date(null)` → epoch (valid!). Guard inputs explicitly. |
| **Test files** | `guards.spec.ts` uses moment for test data setup — update those too. |

---

## 7. Suggested Migration Order

1. **Install packages** — `npm install date-fns date-fns-tz`
2. **Simple files first** — all the single-pattern files in §3 (15 files)
3. **encounter-location.ts** — moderate complexity
4. **event.ts / event.processor.ts** — Moment[] type + loop
5. **ranking-sync.ts** — most complex, last; extract `getFirstMondayOfMonth` helper, change `VisualPublication.date` type
6. **Update test files** — guards.spec.ts
7. **Verify tests pass** — `npx nx test worker-sync`
8. **Remove moment imports** from all 23 files; confirm zero remaining moment usage in scope

---

## 8. Feasibility Score: **8 / 10**

**Why 8 and not 10:**
- The first-Monday-of-month logic in `ranking-sync.ts` has no direct date-fns equivalent and requires a custom helper function — it's not hard but needs careful testing.
- The `VisualPublication.date: Moment` interface type change cascades to ~6 call sites in the same file.
- `format("LLL")` locale handling requires a decision on which locale to use.
- `date-fns-tz` API version mismatch is a real gotcha if the installed version differs from what you expect.

**Why not lower:**
- All other patterns (24 files) map cleanly 1:1 to date-fns functions.
- No runtime timezone parsing is ambiguous — always "Europe/Brussels".
- The existing unit test suite (Phase 1 guards tests) gives confidence for `guards.ts` migration.
- date-fns is a well-documented, stable library with TypeScript-first design.
