import { Page } from 'puppeteer';

export async function detailAccepted(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  }
) {
  const { page } = pupeteer;
  const selector = `.content .wrapper--legacy tbody .icon_rowcheck`;
  {
    const targetPage = page;
    const icon = await targetPage.$(selector);

    if (icon) {
      return true;
    } else {
      return false;
    }

    // try {
    //   await waitForSelector(selector, targetPage, timeout);
    //   return true;
    // } catch (e) {
    //   return false;
    // }
  }
}
