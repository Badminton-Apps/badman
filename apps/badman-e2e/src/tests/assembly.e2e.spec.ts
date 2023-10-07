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

  test('We can select encounter', async ({ page }) => {
    const selectClub = page.locator('badman-select-club input');

    await selectClub.fill('BC Broodrooster');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const selectTeam = page.locator('badman-select-team');
    await selectTeam.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');


    await expect(page.locator('badman-assembly')).toBeVisible();
  });
});
