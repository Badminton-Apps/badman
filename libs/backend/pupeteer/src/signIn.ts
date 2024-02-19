import { Page } from 'puppeteer';
import { waitForSelectors } from './shared';

export async function signIn(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  username: string,
  password: string,
) {
  const { page, timeout } = pupeteer;

  if (!page) {
    throw new Error('No page provided');
  }

  // LOGIN
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors(
      [
        ['aria/Log in'],
        ['body > div.content > div.masthead.masthead--fixed > div.masthead__user > a'],
      ],
      targetPage,
      timeout,
    );
    await element.click({ offset: { x: 32.265625, y: 14.078125 } });
    await Promise.all(promises);
  }

  {
    const targetPage = page;
    const element = await waitForSelectors([['aria/Loginnaam'], ['#Login']], targetPage, timeout);
    await element.type(username);
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [['aria/Wachtwoord'], ['#Password']],
      targetPage,
      timeout,
    );
    await element.type(password);
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors([['aria/INLOGGEN'], ['#btnLogin']], targetPage, timeout);
    await element.click({ offset: { x: 50.046875, y: 6.359375 } });
    await Promise.all(promises);
  }

  // Set BADMINTON as main sport (optional)
  try {
    {
      const targetPage = page;
      const element = await waitForSelectors(
        [['aria/Tennis[role="button"]'], ['#selectSport']],
        targetPage,
        timeout,
      );
      await element.click({ offset: { x: 33, y: 23 } });
    }

    {
      const targetPage = page;
      const promises = [];
      promises.push(targetPage.waitForNavigation());
      const element = await waitForSelectors(
        [
          ['aria/Badminton[role="button"]'],
          [
            'body > div.content > div.masthead.masthead--fixed > div.masthead__main > div.sport-selection.dropdown.open > div > ul > li:nth-child(3) > a',
          ],
        ],
        targetPage,
        timeout,
      );
      await element.click({ offset: { x: 29.953125, y: 7.46875 } });
      await Promise.all(promises);
    }
  } catch (error) {
    console.error('Error setting sport', error);
  }
}
