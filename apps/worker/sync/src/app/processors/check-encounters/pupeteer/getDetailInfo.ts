import { waitForSelector } from '@badman/backend-pupeteer';
import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

export async function detailInfo(
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
  logger?.verbose('getDetailInfo');
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  // regex to find 12-10-2022 19:46 format in text
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$('tr');

    let gameLeader: string | null = null;
    let usedShuttle: string | null = null;
    let startedOn: string | null = null;
    let endedOn: string | null = null;

    for (const row of rows) {
      // logger.verbose(`Processing row`);
      const th = await row.$('th');
      if (th) {
        const headerTxt = (await th.evaluate((el) => el.textContent)) || '';
        if (headerTxt.indexOf('Wedstrijdleider') !== -1) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          gameLeader = tdTxt;
        } else if (headerTxt.indexOf('Gebruikte shuttle') !== -1) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          usedShuttle = tdTxt;
        } else if (headerTxt.indexOf('Aanvangsuur Ontmoeting') !== -1) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          startedOn = tdTxt;
        } else if (headerTxt.indexOf('Einduur ontmoeting') !== -1) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          endedOn = tdTxt;
        }
      }
    }

    return {
      gameLeader,
      usedShuttle,
      startedOn,
      endedOn,
    };
  }
}
