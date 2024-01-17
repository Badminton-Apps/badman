import { waitForSelector } from '@badman/backend-pupeteer';
import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

export async function acceptEncounter(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  },
) {
  const { logger } = args || {};
  logger?.verbose('acceptEncounter');
  const { page } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }

  {
    // find the input type submit with value 'Bevestig'
    const selector = `input[type="submit"][value="Uitslag bevestigen"]`;
    const targetPage = page;
    const button = await waitForSelector(
      selector,
      targetPage,
      pupeteer.timeout,
    );

    // if button not found return false
    if (!button) {
      return false;
    }

    // click the button
    await button.click();

    // wait for the page to load
    await targetPage.waitForNavigation();

    return true;
  }
}
