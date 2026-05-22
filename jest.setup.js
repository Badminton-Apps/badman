// Global jest setup — runs once per test file before any test.
//
// EventEntry has a BeforeUpdate/BeforeCreate hook that throws unless an
// IndexCalculationService is registered. In production EnrollmentModule
// registers the real service; test modules rarely import EnrollmentModule,
// so the hook fires against an unregistered slot and crashes.
//
// Stub the service so test fixtures that touch EventEntry (ClubBuilder,
// TeamBuilder, EventCompetitionEntryBuilder, etc.) can save without
// requiring every spec to opt into EnrollmentModule.

try {
  // Lazy require — backend-database may not be on the resolve path for every
  // project that picks up this preset. If it is not, skip silently.
  const { EventEntry } = require("@badman/backend-database");
  if (EventEntry && typeof EventEntry.setIndexCalculationService === "function") {
    EventEntry.setIndexCalculationService({
      calculateOne: async () => ({ _tag: "success", index: 0, resolvedPlayers: [] }),
    });
  }
} catch {
  /* not all projects depend on @badman/backend-database — that is fine */
}
