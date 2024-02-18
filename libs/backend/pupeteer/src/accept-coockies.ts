import { Page } from 'puppeteer';
import { waitForSelectors } from './shared';

export async function accepCookies(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
) {
  const { page, timeout } = pupeteer;

  if (!page) {
    throw new Error('No page provided');
  }

  {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // block any google analytics / ads requests

      if (!request.isInterceptResolutionHandled()) {
        if (request.url().includes('google-analytics') || request.url().includes('ads')) {
          console.log('aborting', request.url());
          request.abort();
        }

        request.continue();
      }
    });
  }

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    await targetPage.goto('https://www.toernooi.nl/cookiewall/');
    await Promise.all(promises);
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors(
      [
        ['aria/AKKOORD'],
        [
          'body > div > div > div > main > form > div.flex-container.message-page__buttons.message-page__buttons--basic.js-simple-accept-view > button.btn.btn--success.js-accept-basic',
        ],
      ],
      targetPage,
      timeout,
    );
    await element.click({ offset: { x: 1.890625, y: 21.453125 } });
    await Promise.all(promises);
  }
}
