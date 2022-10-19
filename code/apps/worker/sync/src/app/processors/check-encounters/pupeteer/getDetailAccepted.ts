import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';
import { Logger } from '@nestjs/common';

export async function detailAccepted(
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
  logger?.debug('detailAccepted');
  const { page, timeout } = pupeteer;
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$('tr');

    // find if a row has header 'Teamwedstrijd bevestigd' and td with 'Ja'
    let hasAccepted = false;
    for (const row of rows) {
      const header = await row.$('th');
      if (header) {
        // logger.verbose(`Processing row`);
        const text = await header.evaluate((el) => el.textContent);
        if (text.indexOf('Teamwedstrijd bevestigd') !== -1) {
          const td = await row.$('td');
          if (td) {
            const text = await td.evaluate((el) => el.textContent);
            // logger.verbose(`Processing td: ${text}`);
            if (text !== 'Nee') {
              hasAccepted = true;
            }
          }
        }
      }

      if (hasAccepted) {
        break;
      }
    }

    return hasAccepted ? true : false;
  }
}
