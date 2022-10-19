import { Player } from '@badman/backend-database';
import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';

export async function searchPlayer(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  player: Player
) {
  const { page, timeout } = pupeteer;
  const url = `https://www.toernooi.nl/ranking/`;

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
    await element.type(player.memberId);
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

  return url;
}
