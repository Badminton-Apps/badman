import { expect } from '@playwright/test';
import { bTest } from '../fixture';

bTest('Landing page', async ({ homePage }) => {
  // if page is visible
  await expect(homePage.ranking).toBeVisible();

  // if header is visible
  await expect(homePage.ranking.locator('h3')).toContainText('Ranking table');

  // should contain 12 rows
  await expect(homePage.ranking.locator('tbody tr')).toHaveCount(12);
});
