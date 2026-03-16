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

    // Validate page state before navigation
    if (targetPage.isClosed()) {
      throw new Error("Page is closed, cannot proceed with sign in");
    }

    const loginButtonSelectors = [
      ["aria/Log in"],
      ["body > div.content > div.masthead.masthead--fixed > div.masthead__user > a"],
    ];

    let element: Awaited<ReturnType<typeof waitForSelectors>>;
    try {
      element = await waitForSelectors(loginButtonSelectors, targetPage, timeout);
    } catch (loginButtonError: unknown) {
      const msg = loginButtonError instanceof Error ? loginButtonError.message : String(loginButtonError);
      logger?.warn("Log in button not found, re-checking if already signed in:", msg);
      try {
        const profileMenu = await targetPage.waitForSelector("#profileMenu", { timeout: 2000 });
        if (profileMenu) {
          logger?.log("User is already signed in (profileMenu found after retry), skipping login");
          return;
        }
      } catch {
        // profileMenu not found, so we really need to log in and can't
      }
      throw new Error(
        `Login button not found. Site layout may have changed or we're not on the expected page. ${msg}`
      );
    }
    if (!element) throw new Error("Login button not found");

    const promises = [];
    const navigationPromise = targetPage
      .waitForNavigation({
        timeout: timeout || 5000,
        waitUntil: "networkidle0",
      })
      .catch((error: any) => {
        // Handle detached frame errors gracefully
        if (error?.message?.includes("detached") || error?.message?.includes("Frame")) {
          logger?.warn("Navigation frame detached, page may have already navigated:", error?.message);
          return null;
        }
        throw error;
      });
    promises.push(navigationPromise);

    await element.click({ offset: { x: 32.265625, y: 14.078125 } });
    
    try {
      await Promise.all(promises);
    } catch (error: any) {
      // If navigation failed but page is still usable, continue
      if (error?.message?.includes("detached") || error?.message?.includes("Frame")) {
        logger?.warn("Navigation promise failed due to detached frame, continuing:", error?.message);
        // Wait a bit for page to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
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
    
    // Validate page state before navigation
    if (targetPage.isClosed()) {
      throw new Error("Page is closed, cannot proceed with login submission");
    }
    
    const promises = [];
    const navigationPromise = targetPage
      .waitForNavigation({
        timeout: timeout || 5000,
        waitUntil: "networkidle0",
      })
      .catch((error: any) => {
        // Handle detached frame errors gracefully
        if (error?.message?.includes("detached") || error?.message?.includes("Frame")) {
          logger?.warn("Navigation frame detached during login, page may have already navigated:", error?.message);
          return null;
        }
        throw error;
      });
    promises.push(navigationPromise);
    
    const element = await waitForSelectors([["aria/INLOGGEN"], ["#btnLogin"]], targetPage, timeout);
    if (!element) throw new Error("Login button not found");
    await element.click({ offset: { x: 50.046875, y: 6.359375 } });
    
    try {
      await Promise.all(promises);
    } catch (error: any) {
      // If navigation failed but page is still usable, continue
      if (error?.message?.includes("detached") || error?.message?.includes("Frame")) {
        logger?.warn("Login navigation promise failed due to detached frame, continuing:", error?.message);
        // Wait a bit for page to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
}
