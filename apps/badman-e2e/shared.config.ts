import { workspaceRoot } from '@nx/devkit';
import dotenv from 'dotenv';
import { PlaywrightTestConfig } from '@playwright/test';
import path from 'node:path';

dotenv.config({ path: path.resolve(workspaceRoot, '.env.test') });

/**
 * See https://playwright.dev/docs/test-configuration.https://github.com/Badminton-Apps/badman/actions/runs/7568349931/job/20609664637#logs
 */
export const sharedConfig = (env: { [key: string]: string }) => {
  const baseURL = env.BASE_URL || process.env.BASE_URL || `http://localhost:${env.PORT || 5000}`;

  return {
    use: {
      baseURL,
      trace: 'on-first-retry',
    },

    retries: 2,
    workers: process.env.CI ? 1 : undefined,
    webServer: {
      command: 'bun dist/apps/api/main.js',
      url: `${baseURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...env,
        NODE_ENV: 'test',
      },
    },
  } as const as PlaywrightTestConfig;
};
