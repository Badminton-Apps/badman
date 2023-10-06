import { expect, test } from '@playwright/test';
import { setup } from '../utils/setup';

test.describe('Assembly page', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/competition/assembly');
  });

  test('if page is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Team assembly');
  });
});
