import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';
import { Logger } from '@nestjs/common';

export async function hasTime(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  }
) {
  const { logger } = args || {};
  logger?.verbose('checkTime');
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$('tr');

    // find if a row has header 'Teamwedstrijd bevestigd' and td with 'Ja'
    let hasTime = false;
    for (const row of rows) {
      const header = await row.$('th');
      if (header) {
        // logger.verbose(`Processing row`);
        const text = await header.evaluate((el) => el.textContent);
        if (text?.indexOf('Tijdstip') !== -1) {
          const td = await row.$('td');
          if (td) {
            const text = await td.evaluate((el) => el.textContent);
            if ((text?.length ?? 0) > 0) {
              hasTime = true;
            }
          }
        }
      }

      if (hasTime) {
        break;
      }
    }

    return hasTime ? true : false;
  }
}
