import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";
import { WINNER_VALUE_MAPPING } from "../../../utils/mapWinnerValues";

export async function enterWinner(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  matchId: string,
  winner: number,
  logger: Logger
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  const selector = `#match_${matchId}_winner`;
  logger.debug(`Selecting winner ${winner} in ${selector}`);
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.click({ offset: { x: 232, y: 15 } });
  }
  {
    const targetPage = page;
    const option = await waitForSelectors([[selector]], targetPage, timeout);

    const options = await option.$$("option");
    let selectedOption = null;

    // Debug: Log all available option values
    const availableValues: number[] = [];
    for (const currentOption of options) {
      const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);
      if (optionValue) {
        availableValues.push(optionValue);
      }
    }
    logger.debug(`Available winner option values: [${availableValues.join(", ")}]`);

    // First, try to find the original winner value
    for (const currentOption of options) {
      const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);

      if (!optionValue) {
        continue;
      }

      if (optionValue === winner) {
        selectedOption = await currentOption.evaluate((el) => el.value);
        logger.debug(`Found original winner value ${winner} in select options`);
        break;
      }
    }

    // If not found, try the mapped value for alternative competitions
    if (!selectedOption && WINNER_VALUE_MAPPING[winner]) {
      const mappedWinner = WINNER_VALUE_MAPPING[winner];
      logger.debug(
        `Original winner value ${winner} not found, trying mapped value ${mappedWinner}`
      );

      for (const currentOption of options) {
        const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);

        if (!optionValue) {
          continue;
        }

        if (optionValue === mappedWinner) {
          selectedOption = await currentOption.evaluate((el) => el.value);
          logger.debug(`Found mapped winner value ${mappedWinner} in select options`);
          break;
        }
      }
    }

    if (!selectedOption) {
      const mappedValue = WINNER_VALUE_MAPPING[winner];
      const errorMsg = `Could not find winner ${winner}${mappedValue ? ` or mapped value ${mappedValue}` : ""} in select options`;
      logger.error(errorMsg);
      console.error(errorMsg);
    }

    await option.focus();
    await option.evaluate((el, value) => {
      // Cast to HTMLSelectElement to access selectedIndex
      const select = el as HTMLSelectElement;
      // Find the index of the option with the matching value
      const index = Array.from(select.options).findIndex((opt) => opt.value === value);
      if (index !== -1) {
        select.selectedIndex = index;
      }

      // Trigger necessary events
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, selectedOption);
  }
}
