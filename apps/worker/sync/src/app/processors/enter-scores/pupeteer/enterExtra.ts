import { Page } from 'puppeteer';
import { waitForSelectors } from '@badman/backend-pupeteer';

export async function enterGameLeader(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  leader: string,
) {
  if (!leader) {
    return;
  }

  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `#matchfield_1`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(leader);
  }
}

export async function enterShuttle(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  shuttle: string,
) {
  if (!shuttle) {
    return;
  }

  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `#matchfield_2`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(shuttle);
  }
}

export async function enterStartHour(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  startHour: string,
) {
  if (!startHour) {
    return;
  }

  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `#matchfield_3`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(startHour);
  }
}

export async function enterEndHour(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  endHour: string,
) {
  if (!endHour) {
    return;
  }

  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `#matchfield_4`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(endHour);
  }
}

/**
 * Enables input validation by clicking in the last set input field
 * This triggers the browser's validation system to check all form inputs
 * @param pupeteer Puppeteer page object and timeout
 * @param logger Optional logger for debugging
 */
export async function enableInputValidation(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  logger?: any
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }

  try {
    logger?.debug('Enabling input validation by finding last set input field...');
    
    // Find all set input fields with pattern "match_XXXX_set_1" where XXXX is 4 digits
    const selector = 'input[id^="match_"][id$="_set_1"]';
    
    logger?.debug(`Looking for set input fields with pattern: ${selector}`);
    
    const elements = await page.$$(selector);
    
    if (elements.length === 0) {
      logger?.error('Could not find any set input fields');
      return;
    }
    
    logger?.debug(`Found ${elements.length} set input fields`);
    
    // Get the last element
    const lastElement = elements[elements.length - 1];
    
    // Get the ID of the last element for logging
    const elementId = await page.evaluate(el => el.id, lastElement);
    logger?.debug(`Selected last set input field: ${elementId}`);
    
    // Click in the input field to focus it and trigger validation
    await lastElement.click();
    
    // Optionally, click outside to blur the field and trigger validation events
    await page.click('body', { offset: { x: 0, y: 0 } });
    
    logger?.debug(`Input validation enabled using field: ${elementId}`);
    
  } catch (error) {
    logger?.error('Error enabling input validation:', error);
    throw error;
  }
}


