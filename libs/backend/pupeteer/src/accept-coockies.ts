import { Page } from "puppeteer";
import { waitForSelectors } from "./shared";
import { Logger } from "@nestjs/common";

export async function acceptCookies(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args?: {
    logger?: Logger;
  }
) {
  const { page, timeout } = pupeteer;
  const { logger } = args || {};
  logger?.verbose("acceptCookies");

  if (!page) {
    throw new Error("No page provided");
  }

  {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      // block any google analytics / ads requests

      if (!request.isInterceptResolutionHandled()) {
        if (request.url().includes("google-analytics") || request.url().includes("ads")) {
          // console.log('aborting', request.url());
          request.abort();
        } else {
          request.continue();
        }
      }
    });
  }

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    await targetPage.goto("https://www.toernooi.nl/cookiewall/");
    await Promise.all(promises);
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    const element = await waitForSelectors(
      [['button[type="submit"]'], ["button.btn.btn--success.js-accept-basic"]],
      targetPage,
      timeout
    );
    await element.click({ offset: { x: 1.890625, y: 21.453125 } });
    await Promise.all(promises);
  }

  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());

    // Wait for the page to be idle
    logger?.debug("waiting for network idle");
    await targetPage.waitForNetworkIdle({ idleTime: 500, timeout: timeout });
    logger?.debug("network idle");

    // Check for consent dialog frame without waiting
    const consentDialogFrame = await targetPage.$(
      'iframe[src="https://nojazz.eu/nl/cmp/consentui-2.2-consentmode/"]'
    );
    logger?.debug("consentDialog found:", !!consentDialogFrame);

    if (consentDialogFrame) {
      const frame = await consentDialogFrame.contentFrame();
      if (frame) {
        try {
          const greenButton = await frame.waitForSelector("#consentui .btn.green", {
            timeout: 1000,
          });
          if (greenButton) {
            logger?.debug("Found green button in consent dialog, clicking");
            await greenButton.click();
            // Wait for the dialog to disappear and page to be idle again
            await targetPage.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
          }
        } catch (error: any) {
          logger?.debug(
            "No green button found in consent dialog:",
            error?.message || "Unknown error"
          );
        }
      }
    } else {
      logger?.debug("No consent dialog frame found, continuing");
    }
  }
}
