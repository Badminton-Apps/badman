//This fixture is used to access the home page and we use this in our tests.
import { test as base } from '@playwright/test';
import AssemblyPage from './pages/assembly.page';
import HomePage from './pages/home.page';

type testFixture = {
  homePage: HomePage;
  assemblyPage: AssemblyPage;
};
export const test = base.extend<testFixture>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await use(homePage);
  },
  assemblyPage: async ({ page }, use) => {
    const assemblyPage = new AssemblyPage(page);
    await assemblyPage.goto();
    await use(assemblyPage);
  },
});

export { expect } from '@playwright/test';
