import { Page } from '@playwright/test';

export const setup = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('translation.language', 'en');
  });
};
