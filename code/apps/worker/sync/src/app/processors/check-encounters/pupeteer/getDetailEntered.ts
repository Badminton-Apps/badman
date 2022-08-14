import { waitForSelector } from '@badman/backend/pupeteer';
import { Page } from 'puppeteer';

export async function detailEntered(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  }
) {
  const { page, timeout } = pupeteer;
  const selector = `.content .wrapper--legacy tbody`;
  {
    const targetPage = page;
    const body = await waitForSelector(selector, targetPage, timeout);

    const rows = await body.$$('tr');
    return rows.length === 11;
  }
}
