import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

import { workspaceRoot } from '@nx/devkit';
import dotenv from 'dotenv';

dotenv.config({
  path:[ `.env.test`],
  override: true,
});

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:5000';

/**
 * See https://playwright.dev/docs/test-configuration.https://github.com/Badminton-Apps/badman/actions/runs/7568349931/job/20609664637#logs
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: '../badman-e2e/src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  reporter: [['html'], [process.env.CI ? 'github' : 'list']],
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
      NODE_ENV: 'test',
      PORT: '5000',
    },
  },
  projects: [

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
