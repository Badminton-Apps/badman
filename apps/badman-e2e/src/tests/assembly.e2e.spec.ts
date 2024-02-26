import { expect } from '@playwright/test';
import { test } from '../fixture';
import { TestNames } from '@badman/utils';

const players = TestNames.BCBroodrooster.players;

test.describe('AssemblyPage page', () => {
  test('if page is visible', async ({ assemblyPage }) => {
    await expect(assemblyPage.header).toContainText('Team assembly');

    // Check if all the types are correct
    expect(players.M6).toBe('M 6-6-6 BC Broodrooster');
    expect(players.M7).toBe('M 7-7-7 BC Broodrooster');
    expect(players.M8).toBe('M 8-8-8 BC Broodrooster');
    expect(players.M9).toBe('M 9-9-9 BC Broodrooster');
    expect(players.F1).toBe('F 1-1-1 BC Broodrooster');
    expect(players.F5).toBe('F 5-5-5 BC Broodrooster');
    expect(players.F6).toBe('F 6-6-6 BC Broodrooster');
    expect(players.F7).toBe('F 7-7-7 BC Broodrooster');
    expect(players.F8).toBe('F 8-8-8 BC Broodrooster');
  });

  test.describe('Assembly', () => {
    test('Mixed assembly', async ({ assemblyPage }) => {
      await assemblyPage.selectClub(TestNames.BCBroodrooster.name);
      await assemblyPage.selectTeam(TestNames.BCBroodrooster.teams.G1);

      await expect(assemblyPage.encounterSelect).toContainText(
        `against ${TestNames.BCTandpasta.teams.G1}`,
      );
      await expect(assemblyPage.playerList).toBeVisible();

      await expect(assemblyPage.double1List).toContainText('Men doubles');
      await expect(assemblyPage.double2List).toContainText('Women doubles');
      await expect(assemblyPage.double3List).toContainText('Mixed 1');
      await expect(assemblyPage.double4List).toContainText('Mixed 2');

      await expect(assemblyPage.single1List).toContainText('Men Single 1');
      await expect(assemblyPage.single2List).toContainText('Men Single 2');
      await expect(assemblyPage.single3List).toContainText('Women Single 1');
      await expect(assemblyPage.single4List).toContainText('Women Single 2');

      // Drag player 8888 and 999 to singles reversed
      await assemblyPage.dragPlayer(players.M8, assemblyPage.single2List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.single1List);

      // Drag player 8888 to single women
      await assemblyPage.dragPlayer(players.M8, assemblyPage.single3List);
      await expect(assemblyPage.single3List).not.toContainText(players.M8);

      await assemblyPage.dragPlayer(players.F6, assemblyPage.single3List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.single4List);

      // Drag player 8888 and 999 to doubles
      await assemblyPage.dragPlayer(players.M8, assemblyPage.double1List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.double1List);

      await assemblyPage.dragPlayer(players.F6, assemblyPage.double2List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.double2List);

      // drag 2 men to mixed doubles
      await assemblyPage.dragPlayer(players.M8, assemblyPage.double3List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.double3List);
      await expect(assemblyPage.double3List).not.toContainText(players.M9);

      // drag 2 men to mixed doubles
      await assemblyPage.dragPlayer(players.F6, assemblyPage.double4List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.double4List);
      await expect(assemblyPage.double4List).not.toContainText(players.F7);

      await assemblyPage.dragPlayer(players.F7, assemblyPage.double3List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.double4List);

      await expect(assemblyPage.titulars.index).toContainText('Index: 90');
      await expect(assemblyPage.validationOverview).toContainText(
        `${players.M8} in single 2 has a higher index than ${players.M9} in single 1.`,
      );
      await expect(assemblyPage.validationOverview).toContainText(
        `${players.F6} or ${players.M9} in mixed 2 has a better individual ranking then ${players.F7} or ${players.M8} on mixed 1`,
      );

      await expect(assemblyPage.double1List).toContainText(players.M8);
      await expect(assemblyPage.double1List).toContainText(players.M9);

      await expect(assemblyPage.double2List).toContainText(players.F6);
      await expect(assemblyPage.double2List).toContainText(players.F7);

      await expect(assemblyPage.double3List).toContainText(players.F7);
      await expect(assemblyPage.double3List).toContainText(players.M8);

      await expect(assemblyPage.double4List).toContainText(players.F6);
      await expect(assemblyPage.double4List).toContainText(players.M9);

      await expect(assemblyPage.single1List).toContainText(players.M9);
      await expect(assemblyPage.single2List).toContainText(players.M8);

      await expect(assemblyPage.single3List).toContainText(players.F6);
      await expect(assemblyPage.single4List).toContainText(players.F7);
    });

    test('Males assembly', async ({ assemblyPage }) => {
      expect(TestNames.BCBroodrooster.name).toBeDefined();
      expect(TestNames.BCBroodrooster.teams.M1).toBeDefined();

      await assemblyPage.selectClub(TestNames.BCBroodrooster.name);
      await assemblyPage.selectTeam(TestNames.BCBroodrooster.teams.M1);

      await expect(assemblyPage.encounterSelect).toContainText(
        `against ${TestNames.BCTandpasta.teams.M1}`,
      );
      await expect(assemblyPage.playerList).toBeVisible();

      await expect(assemblyPage.double1List).toContainText('Men Double 1');
      await expect(assemblyPage.double2List).toContainText('Men Double 2');
      await expect(assemblyPage.double3List).toContainText('Men Double 3');
      await expect(assemblyPage.double4List).toContainText('Men Double 4');

      await expect(assemblyPage.single1List).toContainText('Men Single 1');
      await expect(assemblyPage.single2List).toContainText('Men Single 2');
      await expect(assemblyPage.single3List).toContainText('Men Single 3');
      await expect(assemblyPage.single4List).toContainText('Men Single 4');

      // Drag player 8888 and 999 to doubles
      await assemblyPage.dragPlayer(players.M6, assemblyPage.double1List);
      await assemblyPage.dragPlayer(players.M7, assemblyPage.double1List);

      await assemblyPage.dragPlayer(players.M6, assemblyPage.double2List);
      await assemblyPage.dragPlayer(players.M7, assemblyPage.double2List);

      await assemblyPage.dragPlayer(players.M7, assemblyPage.double3List);
      // can't play more then 3 matches
      await expect(assemblyPage.double3List).not.toContainText(players.M7);
      await assemblyPage.dragPlayer(players.M8, assemblyPage.double3List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.double3List);

      await assemblyPage.dragPlayer(players.M8, assemblyPage.double4List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.double4List);

      // Drag player 8888 and 999 to singles reversed
      await assemblyPage.dragPlayer(players.M8, assemblyPage.single2List);
      await assemblyPage.dragPlayer(players.M9, assemblyPage.single1List);

      await assemblyPage.dragPlayer(players.M6, assemblyPage.single3List);
      await assemblyPage.dragPlayer(players.M7, assemblyPage.single4List);

      await expect(assemblyPage.double1List).toContainText(players.M6);
      await expect(assemblyPage.double1List).toContainText(players.M7);

      await expect(assemblyPage.double2List).toContainText(players.M6);
      await expect(assemblyPage.double2List).toContainText(players.M7);

      await expect(assemblyPage.double3List).toContainText(players.M8);
      await expect(assemblyPage.double3List).toContainText(players.M9);

      await expect(assemblyPage.double4List).toContainText(players.M8);
      await expect(assemblyPage.double4List).toContainText(players.M9);

      await expect(assemblyPage.single1List).toContainText(players.M9);
      await expect(assemblyPage.single2List).toContainText(players.M8);

      await expect(assemblyPage.single3List).toContainText(players.M6);
      await expect(assemblyPage.single4List).toContainText(players.M7);

      await expect(assemblyPage.titulars.index).toContainText('Index: 60');
      await expect(assemblyPage.validationOverview).toContainText(
        `${players.M8} in single 2 has a higher index than ${players.M9} in single 1.`,
      );
      await expect(assemblyPage.validationOverview).toContainText(
        `${players.M6} in single 3 has a higher index than ${players.M8} in single 2.`,
      );
    });

    test('Females assembly', async ({ assemblyPage }) => {
      expect(TestNames.BCBroodrooster.name).toBeDefined();
      expect(TestNames.BCBroodrooster.teams.F1).toBeDefined();

      await assemblyPage.selectClub(TestNames.BCBroodrooster.name);
      await assemblyPage.selectTeam(TestNames.BCBroodrooster.teams.F1);

      await expect(assemblyPage.encounterSelect).toContainText(
        `against ${TestNames.BCTandpasta.teams.F1}`,
      );
      await expect(assemblyPage.playerList).toBeVisible();

      await expect(assemblyPage.double1List).toContainText('Women Double 1');
      await expect(assemblyPage.double2List).toContainText('Women Double 2');
      await expect(assemblyPage.double3List).toContainText('Women Double 3');
      await expect(assemblyPage.double4List).toContainText('Women Double 4');

      await expect(assemblyPage.single1List).toContainText('Women Single 1');
      await expect(assemblyPage.single2List).toContainText('Women Single 2');
      await expect(assemblyPage.single3List).toContainText('Women Single 3');
      await expect(assemblyPage.single4List).toContainText('Women Single 4');

      // Drag player 8888 and 999 to doubles
      await assemblyPage.dragPlayer(players.F6, assemblyPage.double1List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.double1List);

      await assemblyPage.dragPlayer(players.F6, assemblyPage.double2List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.double2List);

      await assemblyPage.dragPlayer(players.F7, assemblyPage.double3List);
      // can't play more then 3 matches
      await expect(assemblyPage.double3List).not.toContainText(players.F7);
      await assemblyPage.dragPlayer(players.F8, assemblyPage.double3List);
      await assemblyPage.dragPlayer(players.F5, assemblyPage.double3List);

      await assemblyPage.dragPlayer(players.F8, assemblyPage.double4List);
      await assemblyPage.dragPlayer(players.F5, assemblyPage.double4List);

      // Drag player 8888 and 999 to singles reversed
      await assemblyPage.dragPlayer(players.F8, assemblyPage.single2List);
      await assemblyPage.dragPlayer(players.F5, assemblyPage.single1List);

      await assemblyPage.dragPlayer(players.F6, assemblyPage.single3List);
      await assemblyPage.dragPlayer(players.F7, assemblyPage.single4List);

      await expect(assemblyPage.double1List).toContainText(players.F6);
      await expect(assemblyPage.double1List).toContainText(players.F7);

      await expect(assemblyPage.double2List).toContainText(players.F6);
      await expect(assemblyPage.double2List).toContainText(players.F7);

      await expect(assemblyPage.double3List).toContainText(players.F5);
      await expect(assemblyPage.double3List).toContainText(players.F8);

      await expect(assemblyPage.double4List).toContainText(players.F8);
      await expect(assemblyPage.double4List).toContainText(players.F5);

      await expect(assemblyPage.single1List).toContainText(players.F5);
      await expect(assemblyPage.single2List).toContainText(players.F8);

      await expect(assemblyPage.single3List).toContainText(players.F6);
      await expect(assemblyPage.single4List).toContainText(players.F7);

      await expect(assemblyPage.titulars.index).toContainText('Index: 52');
      await expect(assemblyPage.validationOverview).toContainText(
        `Team index titulars equals 52 cannot be lower then allowed in the division 53F`,
      );

      await expect(assemblyPage.validationOverview).toContainText(
        `${players.F6} in single 3 has a higher index than ${players.F8} in single 2.`,
      );
      await expect(assemblyPage.validationOverview).toContainText(
        `${players.F5} or ${players.F8} in double 3 has a better individual ranking then ${players.F6} or ${players.F7} on double 2`,
      );

      await expect(assemblyPage.validationOverview).toContainText(
        `${players.F5} is not marked as a competition player`,
      );
    });
  });
});
