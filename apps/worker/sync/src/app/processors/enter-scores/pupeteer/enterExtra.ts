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
  const selector = `#matchfield_2`;
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
  const selector = `#matchfield_4`;
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
  const selector = `#matchfield_5`;
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
  const selector = `#matchfield_6`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(endHour);
  }
}
