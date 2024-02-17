import { expect } from '@playwright/test';
import { bTest } from '../fixture';

bTest.describe('AssemblyPage page', () => {
  bTest('if page is visible', async ({ assemblyPage }) => {
    await expect(assemblyPage.header).toContainText('Team assembly');
  });

  bTest.describe('Assembly', () => {
    bTest.beforeEach(async ({ assemblyPage }) => {
      await assemblyPage.selectClub('BC Broodrooster');
      await assemblyPage.selectTeam('BC Broodrooster 1G');
    });

    bTest('Select encounter', async ({ assemblyPage }) => {
      await expect(assemblyPage.encounterSelect).toContainText('against BC Tandpasta 1G');
      await expect(assemblyPage.playerList).toBeVisible();

      // Player 8888 should be visible
      const player = await assemblyPage.getPlayer('M 8-8-8 BC Broodrooster');

      await expect(player).toBeVisible();
    });

    bTest('Drag and drop', async ({ assemblyPage }) => {
      // Drag player 8888 to single men
      await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.single1List);

      await expect(assemblyPage.single1List).toContainText('M 8-8-8 BC Broodrooster');

      await expect(assemblyPage.titulars.index).toContainText('Index: 132');

      // Drag player 8888 to single women
      await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.single1List);

      await expect(assemblyPage.single3List).not.toContainText('M 8-8-8 BC Broodrooster');

      // Drag player 8888 and 999 to doubles
      await assemblyPage.dragPlayer('M 8-8-8 BC Broodrooster', assemblyPage.double1List);
      await assemblyPage.dragPlayer('M 9-9-9 BC Broodrooster', assemblyPage.double1List);

      await expect(assemblyPage.double1List).toContainText('M 8-8-8 BC Broodrooster');
      await expect(assemblyPage.double1List).toContainText('M 9-9-9 BC Broodrooster');

      await expect(assemblyPage.titulars.index).toContainText('Index: 123');

      // Drag player 8888 and 999 to singles reversed and check validation
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
