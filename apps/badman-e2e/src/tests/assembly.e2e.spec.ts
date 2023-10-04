import { expect, test } from '@playwright/test';
import { setup } from '../utils/setup';

test.describe('Assembly page', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/competition/assembly');

    await page.waitForResponse((resp) =>
      resp.url().includes('/api/v1/translate/i18n/en')
    );
  });

  test('if page is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Team assembly');
  });
});
