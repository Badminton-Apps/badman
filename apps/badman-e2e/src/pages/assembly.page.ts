//The homepage file contains the locators and goto method call for our test page. Its basically our page object model class

import type { Locator, Page } from '@playwright/test';
import { dragDrop } from '../utils/dragDrop';
import { setup } from '../utils/setup';

export default class AssemblyPage {
  page: Page;

  readonly header: Locator;

  readonly seasonInput: Locator;
  readonly clubInput: Locator;
  readonly teamSelect: Locator;
  readonly encounterSelect: Locator;
  readonly seasonSelect: Locator;

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
  readonly titulars: {
    index: Locator;
    players: Locator;
  };

  readonly overlay: Locator;

  constructor(page: Page) {
    this.page = page;

    this.clubInput = page.locator('badman-select-club input');
    this.teamSelect = page.locator('badman-select-team');
    this.encounterSelect = page.locator('badman-select-encounter');
    this.seasonSelect = page.locator('badman-select-season');

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

    this.titulars = {
      index: page.locator('.information').locator('.team').locator('.index'),
      players: page.locator('.information').locator('.team'),
    };

    this.overlay = page.locator('.cdk-overlay-container');
  }

  async goto() {
    await setup(this.page);
    await this.page.goto('/competition/assembly');
  }

  /**
   * Selects a club from the club select
   * @param club name of the club
   */
  async selectClub(club: string) {
    await this.clubInput.fill(club);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.page.waitForResponse(
      (resp) => resp.url().includes('/graphql') && resp.status() === 200,
    );

    // wait for season to be loaded
    await this.seasonSelect.waitFor({ state: 'visible' });
  }

  /**
   * Selects a team from the team select
   * @param team name of the team
   */
  async selectTeam(team: string) {
    // click on the mat-label in this.teamInput
    await this.teamSelect.locator('mat-label').click();

    await this.overlay.locator('mat-option').isVisible();

    // find team in overlay
    const teamItem = this.overlay.locator('mat-option').filter({
      hasText: team,
    });

    await teamItem.click();
  }

  /**
   * Drags a player to a list and checks if the player is in the list
   * @param playerName name of the player
   * @param tolist list to drag the player to
   */
  async dragPlayer(playerName: string, tolist: Locator) {
    const player = await this.getPlayer(playerName);

    await dragDrop(this.page, player, tolist);
  }

  /**
   * Gets a player from the player list
   * @param playerName name of the player
   */
  async getPlayer(playerName: string) {
    return this.playerList.locator('badman-assembly-player').filter({
      hasText: playerName,
    });
  }
}
