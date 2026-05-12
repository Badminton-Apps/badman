# Data Model: Teams Export

**Feature**: [spec.md](spec.md)
**Date**: 2026-05-06

---

## Entity Traversal (read-only)

This endpoint performs no writes. The traversal path mirrors the old Angular
`EVENT_TEAMS_EXPORT_QUERY`:

```
EventCompetition
  └─ SubEventCompetition[]   (getSubEventCompetitions)
       └─ DrawCompetition[]  (getDrawCompetitions)
            └─ EventEntry[]  (getEventEntries, include: [Team → Club])
                 └─ Team     ← deduplication unit
                      └─ Club
```

---

## Entities

### EventCompetition

| Field  | Type    | Role                                        |
|--------|---------|---------------------------------------------|
| `id`   | UUID PK | Query param `eventId`; existence check      |
| `name` | string  | Builds `Content-Disposition` filename       |

**Schema**: `event`

---

### SubEventCompetition / DrawCompetition

No output columns derived from these entities. Traversal only.

**Schema**: `event`

---

### EventEntry

| Field    | Type    | Role                                    |
|----------|---------|-----------------------------------------|
| `teamId` | UUID FK | Links entry to `Team`                   |
| `team`   | Team    | Eagerly included; source of output data |

**Schema**: `event`

---

### Team *(unit of deduplication)*

| Field          | Type   | Output column                              | Transformation                              |
|----------------|--------|--------------------------------------------|---------------------------------------------|
| `id`           | UUID   | —                                          | Deduplication key; not in output            |
| `name`         | string | `Ploegnaam` (col 3)                        | None                                        |
| `club`         | Club   | —                                          | Eagerly included                            |
| `preferredDay` | string | `Voorkeur speelmoment (dag)` (col 4)       | ENUM → Dutch: `"monday"` → `"Maandag"` etc; `""` if null |
| `preferredTime`| time   | `Voorkeur speelmoment (tijdstip)` (col 5)  | `"HH:mm:ss"` → `"HH:mm"`; `""` if null     |

**Schema**: `public`

---

### Club

| Field    | Type   | Output column     | Transformation |
|----------|--------|-------------------|----------------|
| `clubId` | number | `Club ID` (col 1) | None           |
| `name`   | string | `Clubnaam` (col 2)| None           |

**Schema**: `public`

---

## Output Columns

| # | Header                           | Source                          | Transformation                  |
|---|----------------------------------|---------------------------------|---------------------------------|
| 1 | `Club ID`                        | `team.club?.clubId`             | None                            |
| 2 | `Clubnaam`                       | `team.club?.name`               | None                            |
| 3 | `Ploegnaam`                      | `team.name`                     | None                            |
| 4 | `Voorkeur speelmoment (dag)`     | `team.preferredDay`             | ENUM → Dutch day name; `""` if null |
| 5 | `Voorkeur speelmoment (tijdstip)`| `team.preferredTime`            | `HH:mm:ss` → `HH:mm`; `""` if null |

---

## Day Name Map

| ENUM value  | Output    |
|-------------|-----------|
| `monday`    | Maandag   |
| `tuesday`   | Dinsdag   |
| `wednesday` | Woensdag  |
| `thursday`  | Donderdag |
| `friday`    | Vrijdag   |
| `saturday`  | Zaterdag  |
| `sunday`    | Zondag    |
| absent/null | `""`      |

---

## Deduplication Rule

A `Set<string>` of team IDs is maintained during traversal. Before writing a row,
check `seen.has(team.id)`. If already seen, skip. Otherwise add to `seen` and write.

The service returns one deduplicated, already-transformed `{ headers, rows }` result.
The controller serialises it into XLSX or CSV without further transformation.
