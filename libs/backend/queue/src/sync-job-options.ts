/**
 * Default options for sync queue jobs (retries, backoff, etc.).
 * Use getSyncJobOptions(overrides) to get options with optional overrides.
 */
export const defaultSyncJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 60000, // 1 minute base, doubles each retry
  },
  removeOnComplete: true,
  removeOnFail: false,
};

/** Overrides for sync job options. All fields optional; pass e.g. jobId, removeOnFail (number keeps last N failed). */
export type SyncJobOptionsOverrides = Partial<
  Omit<typeof defaultSyncJobOptions, "removeOnFail">
> & {
  jobId?: string;
  removeOnFail?: number | boolean;
};

/** Result type: defaults with overrides applied; removeOnFail may be number (e.g. keep last N failed). */
export type SyncJobOptions = Omit<typeof defaultSyncJobOptions, "removeOnFail"> & {
  removeOnFail?: number | boolean;
} & { jobId?: string };

/**
 * Returns sync job options with optional overrides. Overrides take precedence.
 * Use when adding jobs to the sync queue so retry behaviour is consistent and configurable.
 */
export function getSyncJobOptions(overrides?: SyncJobOptionsOverrides): SyncJobOptions {
  if (!overrides) {
    return { ...defaultSyncJobOptions };
  }
  return {
    ...defaultSyncJobOptions,
    ...overrides,
    backoff:
      overrides.backoff !== undefined
        ? overrides.backoff
        : defaultSyncJobOptions.backoff,
  };
}
