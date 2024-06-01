import { Page } from '@playwright/test';

export const acceptCookies = async (page: Page) => {
  // check if google is asking for cookies
  const cookieDialog = page.locator('.fc-dialog-overlay');

  if (await cookieDialog.isVisible()) {
    // click on button with aria-label Do not consent
    await page.getByLabel('Do not consent', { exact: true }).click();
  }
};
