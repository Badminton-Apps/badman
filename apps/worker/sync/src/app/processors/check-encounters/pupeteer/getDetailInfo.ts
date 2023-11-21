import { waitForSelector } from '@badman/backend-pupeteer';
import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

const startHourOptions = [
  'Aanvangsuur Ontmoeting',
  'Beginuur',
  'Aanvangsuur',
  'Heure de début',
] as const;

const endHourOptions = [
  'Einduur ontmoeting',
  'Einduur',
  'Heure de fin',
] as const;

const shuttleOptions = ['Gebruikte shuttle', 'Volant'] as const;

const gameLeaderOptions = [
  'Wedstrijdleider',
  'Responsable Interclubs',
] as const;

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

    const timeRegex = /.*(0[0-9]|1[0-9]|2[0-3])[:u.h]([0-5][0-9])?.*/gim;

    for (const row of rows) {
      // logger.verbose(`Processing row`);
      const th = await row.$('th');
      if (th) {
        const headerTxt = (await th.evaluate((el) => el.textContent)) || '';

        if (gameLeaderOptions.some((e) => headerTxt.indexOf(e) !== -1)) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          gameLeader = tdTxt;
        } else if (shuttleOptions.some((e) => headerTxt.indexOf(e) !== -1)) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          usedShuttle = tdTxt;
        } else if (startHourOptions.some((e) => headerTxt.indexOf(e) !== -1)) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          // get the first group and second group from the regex, first are the hours and second are the minutes
          const timeMatch = timeRegex.exec(tdTxt);
          if (timeMatch && timeMatch.length > 0) {
            startedOn = `${timeMatch[1]}:${timeMatch[2] ?? 0}`;
          }
        } else if (endHourOptions.some((e) => headerTxt.indexOf(e) !== -1)) {
          const td = await row.$('td');
          const tdTxt = (await td?.evaluate((el) => el.textContent)) || '';

          const timeMatch = timeRegex.exec(tdTxt);
          if (timeMatch && timeMatch.length > 0) {
            endedOn = `${timeMatch[1]}:${timeMatch[2] ?? 0}`;
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
