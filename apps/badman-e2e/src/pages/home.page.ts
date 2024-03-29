//The homepage file contains the locators and goto method call for our test page. Its basically our page object model class

import type { Locator, Page } from '@playwright/test';
import { setup } from '../utils/setup';

export default class HomePage {
  page: Page;

  readonly ranking: Locator;

  constructor(page: Page) {
    this.page = page;

    this.ranking = page.locator('section.ranking');
  }

  async goto() {
    await setup(this.page);
    // eslint-disable-next-line playwright/no-networkidle
    await this.page.goto('/', { waitUntil: 'networkidle' });

    // Wait for the page to be loaded
    // eslint-disable-next-line playwright/no-networkidle
    await this.page.waitForLoadState('networkidle');
  }
}
