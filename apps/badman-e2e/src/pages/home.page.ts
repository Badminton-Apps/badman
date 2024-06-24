//The homepage file contains the locators and goto method call for our test page. Its basically our page object model class

import type { Locator, Page } from '@playwright/test';
import { acceptCookies, setup } from '../utils';

export default class HomePage {
  page: Page;

  readonly ranking: Locator;

  constructor(page: Page) {
    this.page = page;

    this.page.on('dialog', (dialog) => dialog.dismiss());

    this.ranking = page.locator('section.ranking');
  }

  async goto() {
    await setup(this.page);

    await this.page.goto('/', { waitUntil: 'networkidle' });

    // Wait for the page to be loaded
    await this.page.waitForLoadState('networkidle');

    // accept cookies
    await acceptCookies(this.page);
  }
}
