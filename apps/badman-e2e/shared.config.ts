
import { workspaceRoot } from '@nx/devkit';
import dotenv from 'dotenv';
import { PlaywrightTestConfig } from '@playwright/test';

dotenv.config({
  path: [`.env.test`],
  override: true,
});

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:5000';
/**
 * See https://playwright.dev/docs/test-configuration.https://github.com/Badminton-Apps/badman/actions/runs/7568349931/job/20609664637#logs
 */
export const sharedConfig = (env: { [key: string]: string; }) =>
  ({
    use: {
      baseURL,
      trace: 'on-first-retry',
    },
    
    retries: 2,
    workers: process.env.CI ? 1 : '20%',
    webServer: {
      command: 'node dist/apps/api/main.js',
      url: `${baseURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      // Our build + serve takes a while, so we need to increase the timeout.
      // timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...env,
        NODE_ENV: 'test',
      },
    },
  }) as const as PlaywrightTestConfig;
