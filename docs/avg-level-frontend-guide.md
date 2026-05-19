# Average Level Page — Frontend Implementation Guide

## What this page shows

For a given competition event, display the **weighted average ranking level** of players per sub-event series, broken down by gender (M/F) and discipline (single/double/mix). Also provides a CSV export.

---

## Backend (already done — do not modify)

### GraphQL field

`averageLevel` is a `@ResolveField` on `SubEventCompetition` in:
`libs/backend/graphql/src/resolvers/event/competition/subevent.resolver.ts`

**How it calculates:**
1. Fetches all draws → encounters → games → players for the sub-event
2. Counts how many games each player played (used as weight)
3. Looks up each player's current ranking level from `RankingLastPlace` (primary system)
4. Returns a **weighted average** (players who played more games count more)
5. Skips male calc for `F`-only events; skips female calc for `M`-only events
6. Result is **cached for 1 week** per sub-event — first cold load will be slow

### GraphQL type

```ts
SubEventCompetitionAverageLevel {
  gender:       "M" | "F"
  single?:      Float   // weighted average ranking level (1–12, lower = better)
  singleCount?: Int     // number of players counted
  double?:      Float
  doubleCount?: Int
  mix?:         Float
  mixCount?:    Int
}
```

### Query to use

```graphql
query GetAvgLevel($id: ID!) {
  eventCompetition(id: $id) {
    id
    subEventCompetitions {
      id
      name
      eventType        # "M" | "F" | "MX"
      averageLevel {
        gender
        single
        singleCount
        double
        doubleCount
        mix
        mixCount
      }
    }
  }
}
```

**Note:** `averageLevel` has a complexity multiplier of ×100 per sub-event. The query is expensive on cold cache. Show a loading skeleton.

---

## What the legacy Angular app did

Source: `libs/frontend/pages/competition/event/src/pages/detail-avg/detail-avg.page.ts`

### Chart structure

One chart per combination of:
- **eventType** (`M` / `F` / `MX`) — the series type (men's / women's / mixed)
- **gender** (`M` / `F`) — the gender of the players being averaged
- **discipline** (`single` / `double` / `mix`)

That's up to **18 charts**. Skip any combination where all data points are null/zero.

### Chart config (ApexCharts)

```ts
type: "line"
height: 350
stroke: { curve: "straight", width: 2 }
dataLabels: { enabled: true, formatter: (v) => v.toFixed(2) }
yaxis (left):  { min: 1, max: 12, tickAmount: 12, reversed: true }  // level 1 = best
yaxis (right): { labels: (v) => Math.round(v) }                     // player count
tooltip: shared: true, intersect: false
```

Each chart has **2 series**:
- `"Average"` — the weighted average level (left y-axis)
- `"Players"` — the player count (right y-axis, hidden from legend)

X-axis categories = sub-event names filtered by `eventType`.

### Filtering logic

```ts
// Filter sub-events by eventType for X-axis
const filtered = subEvents.filter(s => s.eventType === eventType)

// For each sub-event, find the gender entry
const point = subEvent.averageLevel?.find(a => a.gender === gender)

// Skip series entirely if no data
if (!point || point[discipline] == null || point[`${discipline}Count`] == null) return null
// Note: count === 0 is also "no data" since 0 is falsy
```

### Chart title format

```
Reeks: {eventType}, Geslacht: {gender}, Discipline: {discipline}
```

### CSV export

Button triggers a client-side download. Column order:

| name | gender | single | singleCount | double | doubleCount | mix | mixCount |
|------|--------|--------|-------------|--------|-------------|-----|---------|

Row format: `"{subEventName} - {eventType}", gender, single, singleCount, double, doubleCount, mix, mixCount`

Each sub-event produces one row per gender entry (up to 2 rows per sub-event).

---

## How to build it in Next.js

### Route

```
/[locale]/competition/[id]/avg-level
```

### Component type

Client component (`"use client"`) — needs browser APIs for CSV download and chart rendering.

### Recommended charting library

Use whatever charting lib is already in the frontend. The Angular app used ApexCharts (`ng-apexcharts`). The React equivalent is `react-apexcharts`. Alternatively, Recharts or Chart.js work fine — the data shape is simple.

### Page structure

```
<EventName> — Average Level

[Loading skeleton while query runs]

For each eventType in ["M", "F", "MX"]:
  <Section heading: "Reeks: {eventType}">
    For each gender in ["M", "F"]:
      For each discipline in ["single", "double", "mix"]:
        <LineChart ... /> (skip if no data)

[CSV Export button]
```

### Key implementation notes

1. **Y-axis must be reversed** — level 1 is the best ranking, 12 is worst. A lower number = stronger players.
2. **Skip empty series** — `averageLevel` can be `null` on the resolver (nullable field). Also skip when `count === 0` (means no players had a ranking for that discipline).
3. **Two y-axes** — left for average level (1–12 reversed), right for player count (raw integer).
4. **Show loading state** — the first uncached query for a large event takes several seconds.
5. **`eventId` comes from the URL param** — pass it as `$id` to the query.
6. **Sub-events are not sorted** — they come back in DB insertion order. The Angular app used them as-is; the X-axis labels are the sub-event names.

### CSV download (client-side)

```ts
function downloadCsv(subEvents) {
  const headers = ["name", "gender", "single", "singleCount", "double", "doubleCount", "mix", "mixCount"]
  const rows = subEvents.flatMap(s =>
    (s.averageLevel ?? []).map(a => [
      `${s.name} - ${s.eventType}`,
      a.gender, a.single, a.singleCount, a.double, a.doubleCount, a.mix, a.mixCount
    ])
  )
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  const a = document.createElement("a")
  a.href = url
  a.download = "avg-level.csv"
  a.click()
  URL.revokeObjectURL(url)
}
```
