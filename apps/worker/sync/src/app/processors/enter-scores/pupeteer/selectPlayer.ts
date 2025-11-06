import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";
import { selectOptionByValue } from "../utils/selectSelectOption";
import { addUnknownPlayer } from "./addUnknownPlayer";

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

      if (optionContent.includes(memberId)) {
        logger.debug(`Found player ${memberId} in select with optionContent ${optionContent}`);
        selectedOption = currentOption;
      }
    }
    if (!selectedOption) {
      console.error(`Could not find player ${memberId} in select`);
      await addUnknownPlayer({ page }, option, memberId, logger);
    }

    if (selectedOption) {
      const optionValue = await page.evaluate((el) => el.value, selectedOption);
      await selectOptionByValue(option, optionValue);
    }
  }
}
