import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function waitForSignInConfirmation(
  pupeteer: { page: Page; timeout?: number },
  args?: { logger?: Logger }
): Promise<boolean> {
  const { logger } = args || {};
  logger?.verbose("waitForSignInConfirmation");
  const { page, timeout = 5000 } = pupeteer;
  const el = await page.waitForSelector("#profileMenu", { timeout });
  return !!el;
}
