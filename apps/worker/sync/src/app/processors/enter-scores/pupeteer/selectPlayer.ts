import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";

export async function selectPlayer(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  memberId: string,
  player: "t1p1" | "t1p2" | "t2p1" | "t2p2",
  matchId: string,
  logger: Logger
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  const selector = `#match_${matchId}_${player}`;
  logger.debug(`Selecting player ${memberId} in ${selector}`);
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
      const optionContent = await page.evaluate((el) => el.textContent, currentOption);

      if (!optionContent) {
        continue;
      }

      logger.debug(`optionContent`, optionContent);
      logger.debug(`memberId`, memberId);

      if (optionContent.indexOf(memberId) > -1) {
        selectedOption = currentOption;
      }
    }
    if (!selectedOption) {
      console.error(`Could not find player ${memberId} in select`);
    }

    const optionValue = await page.evaluate((el) => el.value, selectedOption ?? options[3]);
    console.log("optionValue", optionValue);
    // await option.type(optionValue);

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
    }, optionValue);
  }
}
