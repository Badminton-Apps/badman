import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';
import { Logger } from '@nestjs/common';
import moment from 'moment';

export async function detailAccepted(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  },
) {
  const { logger } = args || {};
  logger?.verbose('detailAccepted');
  const timeFinder = /(\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2})/gim;
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
    let hasAccepted = false;
    let acceptedOn: Date | null = null;
    const acceptedBy: string | null = null;
    for (const row of rows) {
      const th = await row.$('th');
      if (th) {
        // logger.verbose(`Processing row`);
        const thTxt = (await th.evaluate((el) => el.textContent)) || '';
        if (thTxt.indexOf('Teamwedstrijd bevestigd') !== -1) {
          const td = await row.$('td');
          if (td) {
            const tdTxt = (await td.evaluate((el) => el.textContent)) || '';
            // logger.verbose(`Processing td: ${text}`);
            if (tdTxt !== 'Nee') {
              hasAccepted = true;

              const match = timeFinder.exec(tdTxt);

              if (match) {
                acceptedOn = moment(match[1], 'D-M-YYYY HH:mm').toDate();
              }
            }
          }
        }
      }

      if (hasAccepted) {
        break;
      }
    }

    return { accepted: hasAccepted ? true : false, acceptedOn, acceptedBy };
  }
}
