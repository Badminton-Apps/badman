import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";

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

    // pass the single handle below
    for (const currentOption of options) {
      const optionValue: number = await page.evaluate((el) => Number(el.value), currentOption);

      if (!optionValue) {
        continue;
      }

      if (optionValue === winner) {
        selectedOption = await currentOption.evaluate((el) => el.value);
        break;
      }
    }
    if (!selectedOption) {
      console.error(`Could not find winner ${winner} in select`);
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
