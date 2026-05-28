# Research: Enrollment Export — REST Endpoint Migration

## 1. Query Strategy — Bulk Player Resolution

**Decision**: Collect all `meta.competition.players[].id` values across all entries in a
single pass, then resolve them with one `Player.findAll({ where: { id: playerIds } })`.
Build a `Map<string, Player>` for O(1) lookup inside the row-building loop.

**Rationale**: The existing service fires `Player.findByPk` inside the innermost loop —
one DB round-trip per player. A competition with 200 teams × 8 players = 1 600
individual queries. The bulk approach collapses this to one query regardless of size.

**Why not a join**: Player IDs are stored in `entry.meta.competition.players` (a JSON
column), not a FK relation. Sequelize cannot join through JSON, so a separate query is
necessary — but it only needs to run once.

---

## 2. Entry Traversal — Keep Existing Structure

**Decision**: Keep the `getSubEventCompetitions → getDrawCompetitions → getEventEntries`
traversal chain, but inside the flat row-building loop replace `Player.findByPk` with a
Map lookup.

**Rationale**: The ordering contract (`eventType ASC, level ASC` → `team name ASC` →
`sortPlayers`) is already expressed via `order` options on each association call. A
single `EventEntry.findAll` with a flat `where: { eventId }` would lose the per-sub-event
ordering without replicating the sort in memory. Keeping the traversal preserves ordering
guarantees with minimal change.

**Alternative considered**: Full flat `EventEntry.findAll` with nested includes and in-memory
sort — rejected because it requires replicating the three-level sort logic and increases
complexity without meaningful performance benefit for this scale.

---

## 3. Missing Team / Unresolvable Player — Skip, Not Throw

**Decision**: Replace `throw new Error("Entry has no team")` with a `this.logger.warn()`
followed by `continue`. If `playerMap.get(meta.id)` returns `undefined`, skip that
player row silently.

**Rationale**: `teamId` is nullable in the `EventEntry` model — it is legitimately absent
for tournament entries. For competition entries fetched via `DrawCompetition → getEventEntries`
it should never be null, but the DB does not enforce this. The original `throw` was a
defensive assertion that crashes the entire export on any violation.

Chosen behaviour: **skip + warn**. The export remains usable (remaining rows intact),
but the server log surfaces the data integrity issue for investigation. Pure silent skip
(no log) was rejected because it would hide a legitimate anomaly; full throw was rejected
because it blocks the user from downloading any data.

---

## 4. Content-Disposition — Include Extension

**Decision**: Set filename to `${eventName}-enrollment.xlsx` (or `.csv`), matching the
pattern used by `getExceptions` and `getLocations`.

**Rationale**: The existing controller uses
`basename(name.xlsx, extname(name.xlsx))` which strips the extension, producing
`eventName` without `.xlsx`. The browser then guesses the MIME type or saves without
extension. Fixed by using the shared `buildExportPayload` helper already in
`ExportController`.

---

## 5. Permission — Reuse `edit:competition`

**Decision**: Use `edit:competition`, the same permission the existing endpoint uses.

**Confirmed**: Already seeded. No new migration needed.

---

## 6. Sum-Index Column Logic

**Decision**: Preserve the existing logic exactly:
- MX sub-event (`eventType === SubEventTypeEnum.MX`): `Somindex gemengde competitie` = `single + double + mix`; `Somindex heren-/damescompetitie` = `""`.
- Non-MX sub-event: `Somindex gemengde competitie` = `""`; `Somindex heren-/damescompetitie` = `single + double`.

**Rationale**: Matches the legacy export; changing this would break downstream consumers.

---

## 7. Draw Name Cleaning

**Decision**: Preserve `drawName.replace(subEventName, "").replace("-", "").trim()` as
the `Reeks` value.

**Rationale**: Existing behaviour strips the sub-event prefix from draw names (e.g.,
`"Heren - Groep 1"` → `"Groep 1"`). Changing this would break the column format.

---

## 8. No New Nx Lib

**Decision**: `EnrollmentService` is a plain `@Injectable()` added directly to
`AppModule.providers`, identical to `TeamsService`, `ExceptionsService`, and
`LocationsService`. No new Nx lib, no new controller.

**Rationale**: All three prior export services use this pattern. Consistency over abstraction.

---

## 9. Test Strategy

Follow `locations.service.spec.ts` pattern:

| Test case | What it verifies |
|-----------|-----------------|
| Returns 12 headers in correct order | Column schema |
| Returns `eventName` | Filename derivation |
| Single player row → 1 row with correct columns | Basic row output |
| Entry with no team → skipped (0 rows) | Null safety |
| Unknown player ID → skipped (0 rows) | Missing player safety |
| MX sub-event → MX sum-index column filled, non-MX column empty | Sum-index logic |
| Non-MX sub-event → non-MX column filled, MX column empty | Sum-index logic |
| Draw name prefix stripped from Reeks column | Draw name cleaning |
| `NotFoundException` when event does not exist | Error propagation |
