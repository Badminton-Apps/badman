import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export function getCurrentUrl(
  pupeteer: { page: Page },
  args?: { logger?: Logger }
): string {
  const { logger } = args || {};
  logger?.verbose("getCurrentUrl");
  const { page } = pupeteer;
  return page.url();
}
