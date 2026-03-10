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

export interface EnterScoresPreflightResult {
  canProceed: boolean;
  reason?: string;
  /** true = headless browser, false = visible browser */
  headless: boolean;
  /** Whether to actually click the save button */
  shouldSave: boolean;
}

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

  return { canProceed: true, headless, shouldSave };
}

/**
 * Determines whether a failure email should be sent based on the job attempt.
 */
export function isFinalAttempt(attemptsMade: number, maxAttempts: number): boolean {
  return attemptsMade >= maxAttempts - 1;
}
