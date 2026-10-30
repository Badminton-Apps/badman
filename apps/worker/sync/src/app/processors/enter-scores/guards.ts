export interface EnterScoresConfig {
  /** Whether VISUAL_SYNC_ENABLED is true (controls headless vs visible browser) */
  visualSyncEnabled: boolean;
  /** Whether ENTER_SCORES_ENABLED is true */
  enterScoresEnabled: boolean;
  /** NODE_ENV value */
  nodeEnv: string;
  /** VR_API_USER */
  username?: string;
  /** VR_API_PASS */
  password?: string;
}

interface EnterScoresPreflightBase {
  /** true = headless browser, false = visible browser */
  headless: boolean;
  /** Whether to actually click the save button */
  shouldSave: boolean;
}

export type EnterScoresPreflightResult =
  | (EnterScoresPreflightBase & { canProceed: false; reason: string })
  | (EnterScoresPreflightBase & { canProceed: true; username: string; password: string });

/**
 * Determines whether the EnterScores job can proceed and how it should behave.
 */
export function enterScoresPreflight(config: EnterScoresConfig): EnterScoresPreflightResult {
  if (!config.username || !config.password) {
    return {
      canProceed: false,
      reason: "No username or password configured for Visual sync",
      headless: true,
      shouldSave: false,
    };
  }

  const headless = !config.visualSyncEnabled;
  const shouldSave = config.nodeEnv === "production" || config.enterScoresEnabled;

  return {
    canProceed: true,
    username: config.username,
    password: config.password,
    headless,
    shouldSave,
  };
}

// Competition season n (2025 = 2025-26) runs 1 Sep - 30 Apr, but some leagues still play
// in May and June, so a season only closes on 1 July of the following year.
export function isSeasonOpen(season: number, now: Date): boolean {
  return now < new Date(season + 1, 6, 1);
}

export function oldestOpenSeason(now: Date): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Determines whether a failure email should be sent based on the job attempt.
 */
export function isFinalAttempt(attemptsMade: number, maxAttempts: number): boolean {
  return attemptsMade >= maxAttempts - 1;
}
