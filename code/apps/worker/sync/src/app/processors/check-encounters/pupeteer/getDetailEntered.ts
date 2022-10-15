import { waitForSelector } from '@badman/backend/pupeteer';
import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

export async function detailEntered(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  }
) {
  const { logger } = args;
  logger?.debug('detailEntered');
  const { page, timeout } = pupeteer;
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$('tr');

    let hasEntered = false;
    for (const row of rows) {
      // logger.verbose(`Processing row`);
      const header = await row.$('th');
      if (header) {
        const text = await header.evaluate((el) => el.textContent);
        if (text.indexOf('Detailuitslag ingevoerd') !== -1) {
          hasEntered = true;
        }
      }

      if (hasEntered) {
        break;
      }
    }

    return hasEntered ? true : false;
  }
}
