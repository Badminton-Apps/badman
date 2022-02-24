export const EVENTS = {
  CONNECTION: 'connection',
  CONNECT: 'connect',

  GAME: {
    SCORE_ENTERED: 'game:score_entered',
    SCORE_UPDATED: 'game:score_updated',
    GAME_STARTED: 'game:game_started',
    GAME_FINISHED: 'game:game_finished',
    ENCOUNTER_FINISHED: 'game:encounter_finished',
  },
  JOB: {
    CRON_STARTED: 'job:cron_started',
    CRON_UPDATE: 'job:cron_update',
    CRON_FINISHED: 'job:cron_finished',
  },
  PLAYER: {
    PLAYER_ADDED: 'player:player_added',
    PLAYER_UPDATED: 'player:player_updated',
    PLAYER_REMOVED: 'player:player_removed',
  },
  CLUB: {
    CLUB_ADDED: 'club:club_added',
    CLUB_UPDATED: 'club:club_updated',
    CLUB_REMOVED: 'club:club_removed',
  }
};
