# Data Model: Export Foundation

No new database tables, columns, or migrations are required for this feature.
All data already exists. This document records the existing entities that are
read and the relationships traversed by the enrollment export.

---

## Entities read (no modifications)

### EventCompetition
- **Used as**: entry point; validated by `eventId` UUID
- **Key fields**: `id` (UUID), `name` (used in download filename)
- **Access**: `EventCompetition.findByPk(eventId)`

### SubEventCompetition
- **Key fields**: `id`, `name`, `eventType`, `level`
- **Access**: `event.getSubEventCompetitions({ order: [['eventType','ASC'],['level','ASC']] })`

### DrawCompetition
- **Key fields**: `id`, `name`
- **Access**: `subEvent.getDrawCompetitions()`

### EventEntry
- **Key fields**: `id`, `meta.competition.players[]`, `meta.competition.teamIndex`
- **Access**: `draw.getEventEntries({ include: [Team], order: [['team','name','ASC']] })`

### Team
- **Key fields**: `id`, `name`
- **Access**: eager-loaded via `EventEntry.include`

### Player
- **Key fields**: `id`, `lastName`, `firstName`, `memberId`, `gender`
- **Access**: `Player.findByPk(meta.id)` — N+1 pattern; pre-existing, not changed here

---

## Enrollment export columns (authoritative reference)

Sheet name: `Enrollment`

| # | Header | Source |
|---|--------|--------|
| 1 | Naam | `player.lastName` |
| 2 | Voornaam | `player.firstName` |
| 3 | Lidnummer | `player.memberId` |
| 4 | Geslacht | `player.gender === 'M' ? 'M' : 'V'` |
| 5 | Ploeg | `` `${team.name} (${meta.teamIndex})` `` |
| 6 | Enkel | `meta.single` |
| 7 | Dubbel | `meta.double` |
| 8 | Gemengd | `meta.mix` |
| 9 | Afdeling | `subEvent.name` |
| 10 | Reeks | `draw.name` stripped of subEvent prefix + leading dash |
| 11 | Somindex gemengde competitie | `single+double+mix` (MX only, else `""`) |
| 12 | Somindex heren-/damescompetitie | `single+double` (non-MX only, else `""`) |

---

## Permission model (existing, not modified)

| Permission string | Endpoint gated |
|-------------------|----------------|
| `edit:competition` | `GET /excel/enrollment` |

No new permission strings are introduced.
