import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

import { workspaceRoot } from '@nx/devkit';
import dotenv from 'dotenv';

dotenv.config({
  path: `.env.test`,
  override: true,
});

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:5000';

/**
 * See https://playwright.dev/docs/test-configuration.https://github.com/Badminton-Apps/badman/actions/runs/7568349931/job/20609664637#logs
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 2,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : '20%',
  /* Timeout for each test, on average our test takes 3 seconds, so 10 should be plenty */
  timeout: 60_000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: process.env.CI ? 'off' : 'on-first-retry',
  },
  reporter: [['html'], [process.env.CI ? 'github' : 'list']],
  /* We build our projects and then api hosts itself and the client */
  webServer: {
    command: 'npx nx run-many -t build -p badman,api && node dist/apps/api/main.js',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    // Our build + serve takes a while, so we need to increase the timeout.
    timeout: 120_000,
    // stdout: 'pipe',
    // stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
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
