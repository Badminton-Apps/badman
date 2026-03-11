import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function waitForNetworkIdle(
  pupeteer: { page: Page },
  opts: { idleTime: number; timeout: number },
  args?: { logger?: Logger }
): Promise<void> {
  const { logger } = args || {};
  logger?.verbose("waitForNetworkIdle");
  const { page } = pupeteer;
  await page.waitForNetworkIdle(opts);
}
