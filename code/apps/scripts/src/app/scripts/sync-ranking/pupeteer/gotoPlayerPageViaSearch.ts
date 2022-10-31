import { Player } from '@badman/backend-database';
import { querySelectorAll } from '@badman/backend-pupeteer';
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
  const { page, } = pupeteer;
  const url = `https://www.toernooi.nl/find/player?q=`;
  const suggestions: string[] = [];

  {
    const targetPage = page;
    await targetPage.goto(`${url}${player.memberId}`);
  }
  {
    const targetPage = page;
    const selector = ['#searchResultArea ul > li h5 a'];
    const options = await querySelectorAll(selector, targetPage);

    for (const option of options) {
      // get href of the option
      const href = await option.evaluate((node) => node.getAttribute('href'));
      suggestions.push(href);
    }
  }

  return suggestions;
}
