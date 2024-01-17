import { expect } from '@playwright/test';
import { badmanTest } from '../fixture';

badmanTest.describe('Landing page', () => {
  badmanTest('if page is visible', async ({ homePage }) => {
    await expect(homePage.ranking).toBeVisible();
  });

  badmanTest('if header is visible', async ({ homePage }) => {
    await expect(homePage.ranking.locator('h3')).toContainText('Ranking table');
  });

  badmanTest('should contain 12 rows', async ({ homePage }) => {
    await expect(homePage.ranking.locator('tbody tr')).toHaveCount(12);
  });
});
