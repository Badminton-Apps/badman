export enum Sync {
  SyncEvents = 'SyncEvents',
  SyncRanking = 'SyncRanking',
  SyncTwizzit = 'SyncTwizzit',

  CheckEncounters = 'CheckEncounters',
  CheckEncounter = 'CheckEncounter',
  CheckRanking = 'CheckRanking',
  ChangeDate = 'ChangeDate',
  EnterScores = 'EnterScores',

  // For scheduling
  // We do this, so our transaction is on the woker and not on the api instance
  ScheduleSyncTournamentEvent = 'ScheduleSyncTournamentEvent',
  ScheduleSyncTournamentSubEvent = 'ScheduleSyncTournamentSubEvent',
  ScheduleSyncTournamentDraw = 'ScheduleSyncTournamentDraw',
  ScheduleSyncTournamentDrawStanding = 'ScheduleSyncTournamentDrawStanding',
  ScheduleSyncTournamentGame = 'ScheduleSyncTournamentMatch',

  ScheduleSyncCompetitionEvent = 'ScheduleSyncCompetitionEvent',
  ScheduleSyncCompetitionSubEvent = 'ScheduleSyncCompetitionSubEvent',
  ScheduleSyncCompetitionDraw = 'ScheduleSyncCompetitionDraw',
  ScheduleSyncCompetitionDrawStanding = 'ScheduleSyncCompetitionDrawStanding',
  ScheduleSyncCompetitionEncounter = 'ScheduleSyncCompetitionEncounter',
  ScheduleSyncCompetitionGame = 'ScheduleSyncCompetitionGame',

  // For processing
  ProcessSyncTournamentEvent = 'ProcessSyncTournamentEvent',
  ProcessSyncTournamentSubEvent = 'ProcessSyncTournamentSubEvent',
  ProcessSyncTournamentDraw = 'ProcessSyncTournamentDraw',
  ProcessSyncTournamentDrawStanding = 'ProcessSyncTournamentDrawStanding',

  ProcessSyncTournamentGame = 'ProcessSyncTournamentMatch',

  ProcessSyncCompetitionEvent = 'ProcessSyncCompetitionEvent',
  ProcessSyncCompetitionSubEvent = 'ProcessSyncCompetitionSubEvent',
  ProcessSyncCompetitionDraw = 'ProcessSyncCompetitionDraw',
  ProcessSyncCompetitionDrawStanding = 'ProcessSyncCompetitionDrawStanding',
  ProcessSyncCompetitionEncounter = 'ProcessSyncCompetitionEncounter',
  ProcessSyncCompetitionGame = 'ProcessSyncCompetitionGame',
}
