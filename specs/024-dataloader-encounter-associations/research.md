# Research: DataLoader for EncounterCompetition associations

## Decision: Two separate loader services — Team and DrawCompetition

**Decision**: `TeamLoaderService` (DataLoader<string, Team>) for home+away, `DrawCompetitionLoaderService` (DataLoader<string, DrawCompetition>) for drawCompetition.

**Rationale**: Home and away are both Team lookups keyed by a team id — one DataLoader handles both. DrawCompetition is a different entity, requiring its own loader. Sharing the team loader between home and away fields within one request means one `Team.findAll` covers all team ids from both associations.

## Decision: Root encounterCompetitions query already eager-loads home/away — N+1 is parent-resolver context

**Decision**: DataLoader only benefits encounters fetched via parent resolvers (e.g., DrawCompetition.encounterCompetitions). The root `encounterCompetitions` query already has `include: [Team as home, Team as away]`.

**Rationale**: When the root query returns encounters with home/away pre-loaded, Sequelize satisfies `encounter.getHome()` from the already-loaded association without a DB call. The field resolvers still call `getHome()` regardless, so the DataLoader benefits the parent-resolver path where no include was specified.

**Action for implementer**: Consider whether the DataLoader is still worth it for the root-query path, or whether the root query should also include DrawCompetition (eliminating the `drawCompetition` N+1 without a DataLoader).

## Decision: Preserve existing try/catch error handling

**Decision**: Keep the `try { ... } catch { return null; }` structure in `home`, `away`, and `drawCompetition` field resolvers. Replace only the inner body.

**Rationale**: The existing error handling catches client disconnects and logs them gracefully. The DataLoader `load()` call can throw if the batch fn errors; wrapping it in the existing try/catch maintains the same observable error behaviour.
