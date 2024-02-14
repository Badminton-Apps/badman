import { nxE2EPreset } from '@nx/playwright/preset';
import { PlaywrightTestConfig, defineConfig, devices } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { sharedConfig } from '../badman-e2e/shared.config';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: '../badman-e2e/src' }),
  ...sharedConfig({
    PORT: `5000`,
    REDIS_PORT: `6379`,
  }),
  // outputDir: 'badman-e2e-desktop-results',
  reporter: [
    [
      'blob',
      {
        fileName: 'desktop-results.zip',
        outputDir: 'blob-report',
      },
    ],
  ],
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
  ],
} as PlaywrightTestConfig);
