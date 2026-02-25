import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";

export async function enterScores(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  set: number,
  scores: string,
  matchId: string,
  logger?: Logger
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  const selector = `#match_${matchId}_set_${set}`;
  logger?.debug(`Entering set ${set} scores "${scores}" in ${selector} for matchId ${matchId}`);

  const targetPage = page;
  const element = await waitForSelectors([[selector]], targetPage, timeout);
  await element.type(scores);

  // Read back the input value to verify it was accepted (helps debug format/validation issues)
  const actualValue = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    return el?.value ?? null;
  }, selector);
  logger?.debug(`Set ${set} input ${selector} value after typing: "${actualValue}"`);
  if (actualValue !== null && actualValue !== scores) {
    logger?.warn(
      `Set ${set} score mismatch for matchId ${matchId}: expected "${scores}", got "${actualValue}"`
    );
  }
}
