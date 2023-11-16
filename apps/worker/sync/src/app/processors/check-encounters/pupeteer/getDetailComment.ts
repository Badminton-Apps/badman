import { querySelectorAll } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';
import { Logger } from '@nestjs/common';

export async function detailComment(
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
  logger?.verbose('detailComment');
  const { page } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }

  const selector = '.content .wrapper--legacy table';
  {
    let hasComment = false;
    const targetPage = page;
    const tables = await querySelectorAll(selector, targetPage);

    // iterate over tables find where caption contains 'Opmerkingen'
    for (const table of tables) {
      const caption = await table.$('caption');
      if (!caption) {
        continue;
      }

      const captionTxt = await caption.evaluate((el) => el.textContent);
      if (!captionTxt) {
        continue;
      }

      if (captionTxt.indexOf('Opmerkingen') === -1) {
        continue;
      }

      // if selector exists, check if tbody has more than 1 row
      const rows = await table.$$('tr');
      if (rows.length > 1) {
        hasComment = true;
      }
    }

    return { hasComment };
  }
}
