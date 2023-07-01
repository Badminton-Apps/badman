import { Player } from '@badman/backend-database';
import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';

export async function getViaRanking(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  player: Player
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const url = `https://www.toernooi.nl/ranking/`;
  let count = 0;

  {
    const targetPage = page;
    await targetPage.goto(url);
  }
  {
    const targetPage = page;
    const selector = ['aria/BBF Rating[role="link"]'];
    const element = await waitForSelector(selector, targetPage, timeout);
    await element.click({
      offset: {
        x: 41,
        y: 2,
      },
    });
    await targetPage.waitForNavigation();
  }

  {
    const targetPage = page;
    const selector = ['aria/Zoeken[role="link"]'];
    const element = await waitForSelector(selector, targetPage, timeout);
    await element.click({
      offset: {
        x: 35.640625,
        y: 17,
      },
    });
  }

  {
    const targetPage = page;
    const selector = ['#cphPage_cphPage_cphPage_tbxFind'];
    const element = await waitForSelector(selector, targetPage, timeout);
    await element.type(player.memberId ?? '');
  }

  {
    const targetPage = page;

    // count li items
    count = await targetPage.evaluate(() => {
      return document.querySelectorAll('#ulSearchSuggest > li').length;
    });
  }
  // If no results are found, return
  if (count === 0) {
    return;
  }
  
  {
    const targetPage = page;
    const selector = ['#ulSearchSuggest > li:nth-child(1) > a'];
    const element = await waitForSelector(selector, targetPage, timeout);
    await element.click({
      offset: {
        x: 176.671875,
        y: 10,
      },
    });
    await targetPage.waitForNavigation();
  }

  {
    const targetPage = page;
    const selector = ['aria/Profiel'];
    const element = await waitForSelector(selector, targetPage, timeout);
    await element.click({
      offset: {
        x: 16.453125,
        y: 9.90625,
      },
    });
    await targetPage.waitForNavigation();
  }


  return url;
}
