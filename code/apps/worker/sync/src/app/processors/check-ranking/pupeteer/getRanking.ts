import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';

export async function getRanking(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  }
) {
  const { page, timeout } = pupeteer;
  let single: number = undefined;
  let double: number = undefined;
  let mix: number = undefined;
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

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Single']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);
    single = parseInt(text);
  }

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Double']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);
    double = parseInt(text);
  }

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Mixed']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);
    mix = parseInt(text);
  }

  return {
    single,
    double,
    mix,
  };
}
