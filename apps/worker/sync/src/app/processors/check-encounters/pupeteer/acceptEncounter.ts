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

  await page.click('#accept');
}
