import { test, expect, Locator } from '@playwright/test';

test.describe('Landing page', () => {
  test.describe('Ranking section', () => {
    let section: Locator;
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      // find section with class ranking
      section = page.locator('section.ranking');
    });

    test('if section is visible', async () => {
      await expect(section).toBeVisible();
    });

    test('if header is visible', async () => {
      const header = section.locator('h3');

      await expect(header).toBeVisible();
      await expect(header).toContainText('Ranking tabel');
    });

    test('should contain 12 rows', async () => {
      const cells = section.locator('tbody tr');

      await expect(cells).toHaveCount(12);
    });
  });
});
