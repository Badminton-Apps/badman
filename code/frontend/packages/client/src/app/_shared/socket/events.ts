export const EVENTS = {
  CONNECTION: 'connection',
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
};
