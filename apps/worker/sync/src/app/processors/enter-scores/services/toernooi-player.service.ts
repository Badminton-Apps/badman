import { Injectable, Logger } from "@nestjs/common";
import { Page, ElementHandle } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";

@Injectable()
export class ToernooiPlayerService {
  private readonly logger = new Logger(ToernooiPlayerService.name);

  /**
   * Select a player for a specific position in a match
   */
  async selectPlayer(
    page: Page,
    memberId: string,
    playerPosition: "t1p1" | "t1p2" | "t2p1" | "t2p2",
    matchId: string,
    timeout: number = 5000
  ): Promise<void> {
    const selector = `#match_${matchId}_${playerPosition}`;
    this.logger.debug(`Selecting player ${memberId} in ${selector}`);

    try {
      // Click the select element
      const element = await waitForSelectors([[selector]], page, timeout);
      await element.click({ offset: { x: 232, y: 15 } });

      // Get the select element and find the player
      const selectElement = await waitForSelectors([[selector]], page, timeout);
      const options = await selectElement.$$("option");
      let selectedOption = null;

      // Look for the player in the options
      for (const currentOption of options) {
        const optionContent = await page.evaluate((el) => el.textContent, currentOption);
        if (optionContent && optionContent.includes(memberId)) {
          this.logger.debug(
            `Found player ${memberId} in select with optionContent ${optionContent}`
          );
          selectedOption = currentOption;
          break;
        }
      }

      if (!selectedOption) {
        this.logger.error(`Could not find player ${memberId} in select`);
        await this.addUnknownPlayer(page, selectElement, memberId, timeout);
        return;
      }

      // Select the option
      const optionValue = await page.evaluate((el) => el.value, selectedOption);
      await this.selectOptionByValue(selectElement, optionValue);
    } catch (error) {
      this.logger.error(`Error selecting player ${memberId} for ${playerPosition}:`, error);
      throw error;
    }
  }

  /**
   * Add an unknown player to the team through the dialog
   */
  private async addUnknownPlayer(
    page: Page,
    selectElement: ElementHandle,
    memberId: string,
    timeout: number
  ): Promise<void> {
    this.logger.debug(`Adding unknown player ${memberId} to team`);

    try {
      // Select the "Add player" option
      await this.selectOptionByValue(selectElement, "-1000");

      // Wait for the dialog to appear
      await waitForSelectors([['[aria-describedby="dlgTeamPlayers"]']], page, timeout);

      // Fill in the player search
      await this.fillPlayerSearch(page, memberId, timeout);

      // Select the player from suggestions
      await this.selectPlayerFromSuggestions(page, timeout);

      // Submit the form
      await this.submitPlayerForm(page, timeout);

      // Select the added player from the team players list
      await this.selectAddedPlayer(page, memberId, timeout);

      // Close the dialog
      await this.closePlayerDialog(page, timeout);
    } catch (error) {
      this.logger.error(`Error in addUnknownPlayer: ${error.message}`);
      throw error;
    }
  }

  private async fillPlayerSearch(page: Page, memberId: string, timeout: number): Promise<void> {
    await waitForSelectors([["#playersuggest"]], page, timeout);
    const playerInput = await page.$("#playersuggest");

    if (!playerInput) {
      throw new Error("Player suggest input not found");
    }

    await playerInput.click();
    await playerInput.type(memberId);
    this.logger.debug(`Typed memberId: ${memberId} into player suggest input`);
  }

  private async selectPlayerFromSuggestions(page: Page, timeout: number): Promise<void> {
    // Wait for suggestions to appear
    await waitForSelectors([["#ulSearchSuggest"]], page, timeout);
    await waitForSelectors([["#ulSearchSuggest li a"]], page, timeout);

    const suggestionLink = await page.$("#ulSearchSuggest li a");
    if (!suggestionLink) {
      throw new Error("Suggestion link not found");
    }

    // Click in the middle of the suggestion
    const boundingBox = await suggestionLink.boundingBox();
    if (!boundingBox) {
      throw new Error("Could not get bounding box for suggestion link");
    }

    const x = boundingBox.x + boundingBox.width / 2;
    const y = boundingBox.y + boundingBox.height / 2;
    await page.mouse.click(x, y);
    this.logger.debug("Clicked on suggestion link");
  }

  private async submitPlayerForm(page: Page, timeout: number): Promise<void> {
    await waitForSelectors([['input[type="submit"]']], page, timeout);
    const submitButton = await page.$('input[type="submit"]');

    if (!submitButton) {
      throw new Error("Submit button not found");
    }

    await submitButton.click();
    this.logger.debug("Clicked submit button");
  }

  private async selectAddedPlayer(page: Page, memberId: string, timeout: number): Promise<void> {
    // Wait for the team players select to be populated
    await waitForSelectors([["#teamplayers"]], page, timeout);

    // Wait for the specific player option to appear
    await page.waitForFunction(
      (substring) => {
        const teamSelect = document.querySelector("#teamplayers");
        if (!teamSelect) return false;
        const options = Array.from(teamSelect.querySelectorAll("option"));
        return options.some(
          (option) => option.textContent && option.textContent.includes(substring)
        );
      },
      { timeout: 5000 },
      memberId.toString()
    );

    const teamPlayersSelect = await page.$("#teamplayers");
    if (!teamPlayersSelect) {
      throw new Error("Team players select not found");
    }

    // Find and click the option with the memberId
    const options = await teamPlayersSelect.$$("option");
    let targetOption = null;

    for (const option of options) {
      const textContent = await page.evaluate((el) => el.textContent, option);
      if (textContent && textContent.includes(memberId.toString())) {
        targetOption = option;
        this.logger.debug(`Found matching option: ${textContent}`);
        break;
      }
    }

    if (!targetOption) {
      throw new Error(`Option with memberId ${memberId} not found in team players select`);
    }

    // Click the option
    const optionBoundingBox = await targetOption.boundingBox();
    if (!optionBoundingBox) {
      throw new Error("Could not get bounding box for target option");
    }

    const optionX = optionBoundingBox.x + optionBoundingBox.width / 2;
    const optionY = optionBoundingBox.y + optionBoundingBox.height / 2;
    await page.mouse.click(optionX, optionY);
    this.logger.debug(`Selected option containing memberId: ${memberId}`);
  }

  private async closePlayerDialog(page: Page, timeout: number): Promise<void> {
    // Find and click the "Sluiten" (Close) button
    await waitForSelectors([[".ui-dialog-buttonset button"]], page, timeout);
    const buttons = await page.$$(".ui-dialog-buttonset button");

    let closeButton = null;
    for (const button of buttons) {
      const buttonText = await page.evaluate((el) => el.textContent, button);
      if (buttonText && buttonText.includes("Sluiten")) {
        closeButton = button;
        break;
      }
    }

    if (!closeButton) {
      throw new Error("Sluiten button not found in dialog buttonset");
    }

    await closeButton.click();
    this.logger.debug("Clicked Sluiten button");

    // Wait for the dialog to close
    await page.waitForSelector('[aria-describedby="dlgTeamPlayers"]', {
      hidden: true,
      timeout: timeout,
    });
    this.logger.debug("Dialog closed successfully");
  }

  /**
   * Utility method to select an option by value
   */
  private async selectOptionByValue(selectElement: ElementHandle, value: string): Promise<void> {
    await selectElement.focus();
    await selectElement.evaluate((el, val) => {
      // Cast to HTMLSelectElement to access selectedIndex
      const select = el as HTMLSelectElement;

      // Find the index of the option with the matching value
      const index = Array.from(select.options).findIndex((opt) => opt.value === val);
      if (index !== -1) {
        select.selectedIndex = index;
      }

      // Trigger necessary events
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }
}
