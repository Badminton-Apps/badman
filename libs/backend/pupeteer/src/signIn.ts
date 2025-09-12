import { Page } from "puppeteer";
import { waitForSelectors } from "./shared";
import { Logger } from "@nestjs/common";

export async function signIn(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args: {
    username: string;
    password: string;
    logger?: Logger;
  }
) {
  const { page, timeout } = pupeteer;
  const { username, password, logger } = args || {};
  logger?.verbose("signIn");

  if (!page) {
    throw new Error("No page provided");
  }

  // Check if user is already signed in by looking for profileMenu button
  try {
    const profileMenuButton = await page.waitForSelector("#profileMenu", { timeout: 2000 });
    if (profileMenuButton) {
      logger?.log("User is already signed in (profileMenu found), exiting signIn function");
      return;
    }
  } catch (error) {
    // profileMenu not found, continue with sign in process
    logger?.log("User not signed in (profileMenu not found), proceeding with sign in");
  }

  // LOGIN
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors(
      [
        ["aria/Log in"],
        ["body > div.content > div.masthead.masthead--fixed > div.masthead__user > a"],
      ],
      targetPage,
      timeout
    );
    if (!element) throw new Error("Login button not found");
    await element.click({ offset: { x: 32.265625, y: 14.078125 } });
    await Promise.all(promises);
  }

  {
    const targetPage = page;
    const element = await waitForSelectors([["aria/Loginnaam"], ["#Login"]], targetPage, timeout);
    if (!element) throw new Error("Login name input not found");
    await element.type(username);
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [["aria/Wachtwoord"], ["#Password"]],
      targetPage,
      timeout
    );
    if (!element) throw new Error("Password input not found");
    await element.type(password);
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors([["aria/INLOGGEN"], ["#btnLogin"]], targetPage, timeout);
    if (!element) throw new Error("Login button not found");
    await element.click({ offset: { x: 50.046875, y: 6.359375 } });
    await Promise.all(promises);
  }
}
