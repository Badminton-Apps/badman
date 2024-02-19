import { Page } from 'puppeteer';

export async function selectBadmninton(
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
    const targetPage = page;

    await targetPage.goto(
      'https://www.toernooi.nl/sportselection/setsportselection/2?returnUrl=%2F',
      {
        timeout,
      },
    );
  }
}
