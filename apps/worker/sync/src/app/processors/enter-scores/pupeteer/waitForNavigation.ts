import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function waitForNavigation(
  pupeteer: { page: Page },
  opts: { waitUntil: "networkidle0" | "load" | "domcontentloaded"; timeout: number },
  args?: { logger?: Logger }
): Promise<void> {
  const { logger } = args || {};
  logger?.verbose("waitForNavigation");
  const { page } = pupeteer;
  await page.waitForNavigation(opts);
}
