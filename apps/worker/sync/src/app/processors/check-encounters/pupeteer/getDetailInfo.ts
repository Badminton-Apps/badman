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
  logger?.verbose('detailInfo');
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

    const timeFinder = /.*(0[0-9]|1[0-9]|2[0-3])[:u]([0-5][0-9]).*/gim;

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

          const match = timeFinder.exec(tdTxt.trim());

          if (match) {
            startedOn = `${match[1]}:${match[2]}`;
          }
        } else if (headerTxt.indexOf('Einduur ontmoeting') !== -1) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          const match = timeFinder.exec(tdTxt.trim());

          if (match) {
            endedOn = `${match[1]}:${match[2]}`;
          }
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
