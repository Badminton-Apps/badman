import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Game } from "@badman/backend-database";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { ToernooiPlayerService } from "./toernooi-player.service";

@Injectable()
export class ToernooiFormService {
  private readonly logger = new Logger(ToernooiFormService.name);

  constructor(private readonly toernooiPlayerService: ToernooiPlayerService) {}

  /**
   * Clear all form fields on the toernooi.nl match page
   */
  async clearAllFields(page: Page, timeout: number = 5000): Promise<void> {
    // Scroll to the reset button
    await page.evaluate(() => window.scroll(0, 595));

    // Find and click the reset button
    const resetButton = await waitForSelectors([["#btnResetSubMatches"]], page, timeout);

    // Handle any dialogs that might appear
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await resetButton.click();

    // Wait for and click the confirmation dialog "Ja" button
    const confirmButton = await waitForSelectors(
      [
        ["aria/Ja"],
        [
          "#bdBase > div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front.dialogerror.ui-draggable.ui-dialog-buttons > div.ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix > div > button:nth-child(1)",
        ],
      ],
      page,
      timeout
    );

    await confirmButton.click({ offset: { x: 16.859375, y: 7.5 } });

    // Wait for the clearing process to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify that required form fields exist and clear them manually if needed
    const fieldsExist = await page.evaluate(() => {
      const field1 = document.getElementById("matchfield_1");
      const field2 = document.getElementById("matchfield_2");
      const field3 = document.getElementById("matchfield_3");
      const field4 = document.getElementById("matchfield_4");
      return field1 && field2 && field3 && field4;
    });

    if (!fieldsExist) {
      const error = "Required form fields (matchfield_1-4) do not exist on the page";
      this.logger.error(error);
      throw new Error(error);
    }

    // Clear the match fields manually
    await page.evaluate(() => {
      (document.getElementById("matchfield_1") as HTMLInputElement).value = "";
      (document.getElementById("matchfield_2") as HTMLInputElement).value = "";
      (document.getElementById("matchfield_3") as HTMLInputElement).value = "";
      (document.getElementById("matchfield_4") as HTMLInputElement).value = "";
    });

    // Scroll back to top
    await page.evaluate(() => window.scroll(0, 0));
  }

  /**
   * Enter game leader in matchfield_1
   */
  async enterGameLeader(page: Page, leader: string, timeout: number = 5000): Promise<void> {
    if (!leader) return;

    const element = await waitForSelectors([["#matchfield_1"]], page, timeout);
    await element.type(leader);
  }

  /**
   * Enter shuttle in matchfield_2
   */
  async enterShuttle(page: Page, shuttle: string, timeout: number = 5000): Promise<void> {
    if (!shuttle) return;

    const element = await waitForSelectors([["#matchfield_2"]], page, timeout);
    await element.type(shuttle);
  }

  /**
   * Enter start hour in matchfield_3
   */
  async enterStartHour(page: Page, startHour: string, timeout: number = 5000): Promise<void> {
    if (!startHour) return;

    const element = await waitForSelectors([["#matchfield_3"]], page, timeout);
    await element.type(startHour);
  }

  /**
   * Enter end hour in matchfield_4
   */
  async enterEndHour(page: Page, endHour: string, timeout: number = 5000): Promise<void> {
    if (!endHour) return;

    const element = await waitForSelectors([["#matchfield_4"]], page, timeout);
    await element.type(endHour);
  }

  /**
   * Enable input validation by clicking the validate match button
   */
  async enableInputValidation(page: Page, timeout: number = 5000): Promise<void> {
    const validateButton = await waitForSelectors([["#btnValidateMatch"]], page, timeout);
    this.logger.debug("Validate button found, clicking...");
    await validateButton.click();
    this.logger.debug("Validate button clicked");
  }

  /**
   * Validate rows for error messages
   */
  async validateRowMessages(page: Page): Promise<void> {
    const errorMessages = await page.evaluate(() => {
      const messageElements = document.querySelectorAll("div.submatchrow_message");
      const messages: string[] = [];

      messageElements.forEach((element: Element) => {
        const text = element.textContent?.trim();
        if (text) {
          messages.push(text);
        }
      });

      return messages;
    });

    if (errorMessages.length > 0) {
      const errorText = errorMessages.join("; ");
      this.logger.error(`Row validation failed with messages: ${errorText}`);
      throw new Error(`Row validation failed: ${errorText}`);
    }
  }

  /**
   * Validate and refill player inputs (merged from FormValidationService)
   */
  async validateAndRefillPlayerInputs(page: Page, games: Game[]): Promise<void> {
    const gamesWithMatchId = games.filter((game) => game.visualCode);

    for (const game of gamesWithMatchId) {
      const matchId = game.visualCode!;
      this.logger.debug(`Validating player inputs for game ${game.order} with matchId: ${matchId}`);

      await this.validateGamePlayerInputs(page, game, matchId);
    }

    this.logger.log("Player input validation completed");
  }

  private async validateGamePlayerInputs(page: Page, game: Game, matchId: string): Promise<void> {
    const playerPositions: Array<"t1p1" | "t1p2" | "t2p1" | "t2p2"> = [
      "t1p1",
      "t1p2",
      "t2p1",
      "t2p2",
    ];

    for (const position of playerPositions) {
      const selectorId = `match_${matchId}_${position}`;

      try {
        const isEmpty = await this.isPlayerInputEmpty(page, selectorId);

        if (isEmpty) {
          await this.refillPlayerInput(page, game, position, matchId);
        }
      } catch (error) {
        this.logger.error(`Error validating selector #${selectorId}:`, error);
      }
    }
  }

  private async isPlayerInputEmpty(page: Page, selectorId: string): Promise<boolean> {
    const selector = await page.$(`#${selectorId}`);
    if (!selector) {
      return false;
    }

    const selectedValue = await page.evaluate((el) => {
      const select = el as HTMLSelectElement;
      return select.value;
    }, selector);

    return selectedValue === "0";
  }

  private async refillPlayerInput(
    page: Page,
    game: Game,
    position: "t1p1" | "t1p2" | "t2p1" | "t2p2",
    matchId: string
  ): Promise<void> {
    const player = this.findPlayerForPosition(game, position);

    if (!player || !player.memberId) {
      return;
    }

    await this.toernooiPlayerService.selectPlayer(page, player.memberId, position, matchId);
  }

  private findPlayerForPosition(game: Game, position: "t1p1" | "t1p2" | "t2p1" | "t2p2"): any {
    return game.players?.find((p) => {
      const membership = p.GamePlayerMembership;
      switch (position) {
        case "t1p1":
          return membership.team === 1 && membership.player === 1;
        case "t1p2":
          return membership.team === 1 && membership.player === 2;
        case "t2p1":
          return membership.team === 2 && membership.player === 1;
        case "t2p2":
          return membership.team === 2 && membership.player === 2;
        default:
          return false;
      }
    });
  }

  /**
   * Check if a game row is empty (all player selectors have value "0" or empty)
   */
  async isGameRowEmpty(page: Page, matchId: string): Promise<boolean> {
    const playerPositions = ["t1p1", "t1p2", "t2p1", "t2p2"];
    const nonEmptySelectors: string[] = [];

    for (const position of playerPositions) {
      const selectorId = `match_${matchId}_${position}`;
      const selector = await page.$(`#${selectorId}`);

      if (selector) {
        const selectedValue = await page.evaluate((el) => {
          const select = el as HTMLSelectElement;
          return select.value;
        }, selector);

        if (selectedValue && selectedValue !== "0") {
          nonEmptySelectors.push(`${selectorId}="${selectedValue}"`);
        }
      }
    }

    if (nonEmptySelectors.length > 0) {
      return false;
    }

    return true;
  }
}
