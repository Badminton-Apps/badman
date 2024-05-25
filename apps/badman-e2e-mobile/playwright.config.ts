import { nxE2EPreset } from '@nx/playwright/preset';
import { PlaywrightTestConfig, defineConfig, devices } from '@playwright/test';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { sharedConfig } from '../badman-e2e/shared.config';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: '../badman-e2e/src' }),
  ...sharedConfig({
    PORT: `5500`,
    REDIS_PORT: `6379`,
  }),
  // outputDir: 'badman-e2e-mobile-results',
  reporter: [
    [
      'blob',
      {
        fileName: 'mobile-results.zip',
        outputDir: 'blob-report',
      },
    ],
  ],
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
} as PlaywrightTestConfig);
