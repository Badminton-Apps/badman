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

  test.describe('assembly', () => {
    test.beforeEach(async ({ page }) => {
      const selectClub = page.locator('badman-select-club input');

      await selectClub.fill('BC Broodrooster');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      const selectTeam = page.locator('badman-select-team');
      await selectTeam.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    });

    test('We can select encounter', async ({ page }) => {
      await expect(page.locator('badman-assembly')).toBeVisible();
    });

    test('Players of team have been loaded', async ({ page }) => {
      const player888M = page
        .locator('badman-assembly-player')
        .filter({ hasText: 'M 8-8-8' });

      await expect(player888M).toBeVisible();
    });

    // test('We can drage a male to the males dubbles', async ({ page }) => {
    //   const malesDoubles = page.locator('#double1List');
    //   const player888M = page
    //     .locator('badman-assembly-player')
    //     .filter({ hasText: 'M 8-8-8' })
    //     .locator('div')
    //     .first();

    //   await expect(player888M).toBeVisible();
    //   await expect(malesDoubles).toBeVisible();

    //   await player888M.dragTo(malesDoubles, {
    //     sourcePosition: { x: 10, y: 20 },
    //     targetPosition: { x: 10, y: 20 },
    //   });

    //   // await expect(malesDoubles).toContainText('M 8-8-8 BC Broodrooster');
    // });
  });
});
