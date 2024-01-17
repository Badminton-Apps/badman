//The homepage file contains the locators and goto method call for our test page. Its basically our page object model class

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dragDrop } from '../utils/dragDrop';
import { setup } from '../utils/setup';

export default class AssemblyPage {
  page: Page;

  readonly header: Locator;

  readonly seasonInput: Locator;
  readonly clubInput: Locator;
  readonly teamInput: Locator;
  readonly encounterInput: Locator;

  readonly single1List: Locator;
  readonly single2List: Locator;
  readonly single3List: Locator;
  readonly single4List: Locator;

  readonly double1List: Locator;
  readonly double2List: Locator;
  readonly double3List: Locator;
  readonly double4List: Locator;

  readonly validationOverview: Locator;
  readonly playerList: Locator;

  readonly overlay: Locator;

  constructor(page: Page) {
    setup(page);
    this.page = page;

    this.clubInput = page.locator('badman-select-club input');
    this.teamInput = page.locator('badman-select-team');
    this.encounterInput = page.locator('badman-select-encounter');

    this.header = page.locator('h1');

    this.single1List = page.locator('#single1List');
    this.single2List = page.locator('#single2List');
    this.single3List = page.locator('#single3List');
    this.single4List = page.locator('#single4List');

    this.double1List = page.locator('#double1List');
    this.double2List = page.locator('#double2List');
    this.double3List = page.locator('#double3List');
    this.double4List = page.locator('#double4List');

    this.validationOverview = page.locator('.validation-overview');
    this.playerList = page.locator('#playerList');

    this.overlay = page.locator('.cdk-overlay-container');
  }

  async goto() {
    await this.page.goto('/competition/assembly');
  }

  async selectClub(club: string) {
    await this.clubInput.fill(club);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // wait for season to be loaded
    await this.page.waitForSelector('badman-select-season');
  }

  async selectTeam(team: string) {
    // click on the mat-label in this.teamInput
    this.teamInput.locator('mat-label').click();

    // find team in overlay
    const teamItem = this.overlay.locator('mat-option').filter({
      hasText: team,
    });

    await teamItem.click();
  }

  async selectEncounter(encounter: string) {
    await this.encounterInput.fill(encounter);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async dragPlayer(playerName: string, tolist: Locator) {
    const player = await this.getPlayer(playerName);

    await dragDrop(this.page, player, tolist);

    await expect(tolist).toContainText(playerName);
  }

  async getPlayer(playerName: string) {
    return this.playerList.locator('badman-assembly-player').filter({
      hasText: playerName,
    });
  }
}
