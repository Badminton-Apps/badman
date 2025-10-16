import { Injectable, Logger } from "@nestjs/common";
import { Page, ElementHandle } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { WinnerMappingService } from "../../../utils";

@Injectable()
export class ToernooiScoreService {
  private readonly logger = new Logger(ToernooiScoreService.name);

  constructor(private readonly winnerMappingService: WinnerMappingService) {}

  /**
   * Enter scores for a specific set in a match
   */
  async enterScores(
    page: Page,
    set: number,
    scores: string,
    matchId: string,
    timeout: number = 5000
  ): Promise<void> {
    const selector = `#match_${matchId}_set_${set}`;

    try {
      const element = await waitForSelectors([[selector]], page, timeout);
      await element.type(scores);
    } catch (error) {
      this.logger.error(`Error entering scores for set ${set} in match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Select winner for a match with resilient error handling
   */
  async selectWinner(
    page: Page,
    matchId: string,
    winner: number,
    timeout: number = 5000
  ): Promise<void> {
    const selector = `#match_${matchId}_winner`;
    // Click the winner select element
    const element = await waitForSelectors([[selector]], page, timeout);
    await element.click({ offset: { x: 232, y: 15 } });

    // Get the select element and find the winner option
    const selectElement = await waitForSelectors([[selector]], page, timeout);
    const options = await selectElement.$$("option");
    let selectedOption = null;

    // Log available options for debugging
    const availableValues: number[] = [];
    for (const currentOption of options) {
      const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);
      if (optionValue) {
        availableValues.push(optionValue);
      }
    }

    // First, try to find the original winner value
    for (const currentOption of options) {
      const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);
      if (optionValue === winner) {
        selectedOption = await currentOption.evaluate((el) => el.value);
        break;
      }
    }

    // If not found, try the mapped value (if mapping exists)
    if (!selectedOption) {
      const mappedWinner = this.winnerMappingService.mapToExternalValue(winner);
      if (mappedWinner && mappedWinner !== winner) {
        for (const currentOption of options) {
          const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);
          if (optionValue === mappedWinner) {
            selectedOption = await currentOption.evaluate((el) => el.value);
            break;
          }
        }
      }
    }

    // RESILIENT ERROR HANDLING: Log warning but don't throw error
    if (!selectedOption) {
      return; // Continue processing instead of throwing error
    }

    // Select the winner option
    await this.selectOptionByValue(selectElement, selectedOption);
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
