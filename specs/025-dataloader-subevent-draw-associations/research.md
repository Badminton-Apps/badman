# Research: DataLoader for SubEvent / DrawCompetition / EventEntry parent FK associations

## Decision: Two loader services — EventCompetitionLoaderService + SubEventCompetitionLoaderService

**Decision**: One loader per parent entity type. `SubEventCompetitionLoaderService` shared by DrawCompetition and EventEntry resolvers.

**Rationale**: DrawCompetition.subEventCompetition and EventEntry.subEventCompetition point to the same parent model (SubEventCompetition), so one DataLoader keyed by `subEventCompetitionId` serves both. Sharing within a request means if a page loads both draws and entries, one batch handles all lookups.

## Decision: subEventCompetitions root query already includes EventCompetition

**Decision**: The N+1 for `SubEvent.eventCompetition` applies only when SubEventCompetition rows come from a parent resolver (not the root `subEventCompetitions` query which already has `include: [{ model: EventCompetition }]`).

**Rationale**: Verified in `subevent.resolver.ts` lines 53-59. DataLoader still provides value for the parent-resolver path (e.g., from EventCompetition.subEventCompetitions). Both paths are valid; the DataLoader handles the lazy case correctly.

## Decision: EventEntry.drawCompetition excluded from scope

**Decision**: `EventEntryResolver.drawCompetition` (line 65-68) also calls `eventEntry.getDrawCompetition()` per row — out of scope here.

**Rationale**: DrawCompetition is a sibling concern to SubEventCompetition. Feature 024's `DrawCompetitionLoaderService` can be reused by EventEntry in a follow-up patch. Keeping scope to SubEventCompetition FK associations keeps this feature focused.
