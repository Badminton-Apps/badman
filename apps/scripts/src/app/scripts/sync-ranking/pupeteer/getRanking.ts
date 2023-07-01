import { waitForSelector } from '@badman/backend-pupeteer';
import { Page } from 'puppeteer';

export async function getRanking(
  pupeteer: {
    page: Page | null;
    timeout: number;
  } = {
    page: null,
    timeout: 5000,
  }
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }

  let single: number | undefined;
  let double: number | undefined;
  let mix: number | undefined;

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Single']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);
    if (text) {
      single = parseInt(text);
    }
  }

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Double']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);

    if (text) {
      double = parseInt(text);
    }
  }

  {
    const targetPage = page;
    const selector = ["#mediaContentSubinfo > ul > li > span[title='Mixed']"];
    const element = await waitForSelector(selector, targetPage, timeout);
    const text = await element.evaluate((node) => node.textContent);

    if (text) {
      mix = parseInt(text);
    }
  }

  return {
    single,
    double,
    mix,
  };
}
