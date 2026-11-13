export enum Sync {
  SyncEvents = "SyncEvents",
  SyncRanking = "SyncRanking",
  SyncTwizzit = "SyncTwizzit",

  CheckEncounters = "CheckEncounters",
  RetryFailedEncounterSync = "RetryFailedEncounterSync",
  CheckEncounter = "CheckEncounter",
  CheckRanking = "CheckRanking",
  ChangeDate = "ChangeDate",
  EnterScores = "EnterScores",

  // For scheduling
  // We do this, so our transaction is on the woker and not on the api instance
  ScheduleSyncTournamentEvent = "ScheduleSyncTournamentEvent",
  ScheduleSyncTournamentSubEvent = "ScheduleSyncTournamentSubEvent",
  ScheduleSyncTournamentDraw = "ScheduleSyncTournamentDraw",
  ScheduleSyncTournamentGame = "ScheduleSyncTournamentMatch",

  ScheduleRecalculateStandingCompetitionEvent = "ScheduleRecalculateStandingCompetitionEvent",
  ScheduleRecalculateStandingCompetitionSubEvent = "ScheduleRecalculateStandingCompetitionSubEvent",
  ScheduleRecalculateStandingCompetitionDraw = "ScheduleRecalculateStandingCompetitionDraw",

  // For processing
  ProcessSyncTournamentEvent = "ProcessSyncTournamentEvent",
  ProcessSyncTournamentSubEvent = "ProcessSyncTournamentSubEvent",
  ProcessSyncTournamentDraw = "ProcessSyncTournamentDraw",
  ProcessSyncTournamentDrawStanding = "ProcessSyncTournamentDrawStanding",

  ProcessSyncTournamentGame = "ProcessSyncTournamentMatch",

  ProcessSyncCompetitionDrawStanding = "ProcessSyncCompetitionDrawStanding",
}
