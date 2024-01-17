import { expect } from '@playwright/test';
import { badmanTest } from '../fixture';

badmanTest.describe('Landing page', () => {
  badmanTest('if page is visible', async ({ assemblyPage }) => {
    await expect(assemblyPage.header).toContainText('Team assembly');
  });

  badmanTest.describe('Assembly', () => {
    badmanTest.beforeEach(async ({ assemblyPage }) => {
      await assemblyPage.selectClub('BC Broodrooster');
      await assemblyPage.selectTeam('BC Broodrooster 1G');
    });

    badmanTest('Select encounter', async ({ assemblyPage }) => {
      await expect(assemblyPage.encounterSelect).toContainText('against BC Tandpasta 1G');
      await expect(assemblyPage.playerList).toBeVisible({ timeout: 60_000 });
    });

    badmanTest('Player 8888 should be visible', async ({ assemblyPage }) => {
      const player = await assemblyPage.getPlayer('M 8-8-8 BC Broodrooster');

      await expect(player).toBeVisible();
    });

    badmanTest.describe('Drag and drop', () => {
      badmanTest('Drag player 8888 to single men', async ({ assemblyPage }) => {
        await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.single1List);

        await expect(assemblyPage.single1List).toContainText('M 8-8-8 BC Broodrooster');

        await expect(assemblyPage.titulars.index).toContainText('Index: 132');
      });

      badmanTest('Drag player 8888 to single women', async ({ assemblyPage }) => {
        await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.single1List);

        await expect(assemblyPage.single3List).not.toContainText('M 8-8-8 BC Broodrooster');
      });

      badmanTest('Drag player 8888 and 999 to doubles', async ({ assemblyPage }) => {
        await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.double1List);
        await assemblyPage.dragPlayer('M 9-9-9 BC Broodrooster', assemblyPage.double1List);

        await expect(assemblyPage.double1List).toContainText('M 8-8-8 BC Broodrooster');
        await expect(assemblyPage.double1List).toContainText('M 9-9-9 BC Broodrooster');

        await expect(assemblyPage.titulars.index).toContainText('Index: 123');
      });

      badmanTest('Drag player 8888 and 999 to singles reversed and check validation', async ({ assemblyPage }) => {
        await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.single2List);
        await assemblyPage.dragPlayer('M 9-9-9 BC Broodrooster', assemblyPage.single1List);

        await expect(assemblyPage.single1List).toContainText('M 9-9-9 BC Broodrooster');
        await expect(assemblyPage.single2List).toContainText('M 8-8-8 BC Broodrooster');

        await expect(assemblyPage.validationOverview).toContainText(
          'M 8-8-8 BC Broodrooster in single 2 has a higher index than M 9-9-9 BC Broodrooster in single 1.',
        );
      });
    });
  });
});
