//The homepage file contains the locators and goto method call for our test page. Its basically our page object model class

import type { Locator, Page } from '@playwright/test';
import { setup } from '../utils/setup';

export default class HomePage {
  page: Page;

  readonly ranking: Locator;


  constructor(page: Page) {
    setup(page);
    this.page = page;

    this.ranking = page.locator('section.ranking');
  }

  async goto() {
    await this.page.goto('/');
  }
}
