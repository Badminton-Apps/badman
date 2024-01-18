import { expect } from '@playwright/test';
import { bTest } from '../fixture';

bTest.describe('Landing page', () => {
  bTest('if page is visible', async ({ homePage }) => {
    await expect(homePage.ranking).toBeVisible();
  });

  bTest('if header is visible', async ({ homePage }) => {
    await expect(homePage.ranking.locator('h3')).toContainText('Ranking table');
  });

  bTest('should contain 12 rows', async ({ homePage }) => {
    await expect(homePage.ranking.locator('tbody tr')).toHaveCount(12);
  });
});
