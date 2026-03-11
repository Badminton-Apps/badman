import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function getRowErrorMessages(
  pupeteer: { page: Page },
  args?: { logger?: Logger }
): Promise<string[]> {
  const { logger } = args || {};
  logger?.verbose("getRowErrorMessages");
  const { page } = pupeteer;
  return page.evaluate(() => {
    const messageElements = document.querySelectorAll("div.submatchrow_message");
    const messages: string[] = [];
    messageElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text) messages.push(text);
    });
    return messages;
  });
}
