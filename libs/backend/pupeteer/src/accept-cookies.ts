import { HTTPRequest, Page } from "puppeteer";
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

  const onRequest = (request: HTTPRequest) => {
    // block any google analytics / ads requests
    if (!request.isInterceptResolutionHandled()) {
      const action =
        request.url().includes("google-analytics") || request.url().includes("ads")
          ? request.abort()
          : request.continue();

      // Catch errors from continue/abort — interception may no longer be active
      // (e.g. page closed or browser restarted while request was in-flight)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      action.catch(() => {});
    }
  };

  await page.setRequestInterception(true);
  page.on("request", onRequest);

  try {
    {
      const targetPage = page;
      const promises = [];
      promises.push(targetPage.waitForNavigation({ timeout: (timeout || 5000) * 3 })); // Use 3x timeout for initial navigation
      await targetPage.goto("https://www.toernooi.nl/cookiewall/");
      try {
        await Promise.all(promises);
      } catch (error: any) {
        logger?.warn("Initial navigation timeout, continuing anyway:", error?.message || error);
      }
    }
    {
      const targetPage = page;
      const promises = [];
      promises.push(targetPage.waitForNavigation({ timeout: (timeout || 5000) * 2 })); // Use 2x timeout for button click navigation
      const element = await waitForSelectors(
        [['button[type="submit"]'], ["button.btn.btn--success.js-accept-basic"]],
        targetPage,
        timeout
      );
      await element.click({ offset: { x: 1.890625, y: 21.453125 } });
      try {
        await Promise.all(promises);
      } catch (error: any) {
        logger?.warn("Cookie button navigation timeout, continuing anyway:", error?.message || error);
      }
    }

    {
      const targetPage = page;

      // Wait for the page to be idle first
      logger?.debug("waiting for network idle");
      try {
        await targetPage.waitForNetworkIdle({ idleTime: 500, timeout: timeout });
        logger?.debug("network idle");
      } catch (error: any) {
        logger?.warn("Network idle timeout, continuing anyway:", error?.message || error);
      }

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

              // Set up navigation promise ONLY when we're about to click
              const navigationPromise = targetPage
                .waitForNavigation({
                  timeout: (timeout || 5000) * 2,
                })
                .catch((error: any) => {
                  // Handle detached frame errors - this can happen when clicking causes navigation
                  if (error?.message?.includes("detached") || error?.message?.includes("Frame")) {
                    logger?.debug("Navigating frame was detached - page may have already navigated:", error?.message || error);
                  } else {
                    logger?.debug("Navigation after consent click timeout:", error?.message || error);
                  }
                  return null; // Don't throw, just return null
                });

              await greenButton.click();

              // Wait for either navigation or network idle, whichever comes first
              await Promise.race([
                navigationPromise,
                targetPage.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => null),
              ]);

              logger?.debug("Consent dialog handled successfully");
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

      // Final check to ensure page is ready
      try {
        await targetPage.waitForNetworkIdle({ idleTime: 300, timeout: 2000 });
        logger?.debug("Final network idle check completed");
      } catch (error: any) {
        logger?.debug("Final network idle timeout, but continuing:", error?.message || error);
      }
    }
  } finally {
    // Clean up request interception but DON'T close the page
    // The page needs to remain open for subsequent operations (e.g., signIn)
    if (!page.isClosed()) {
      page.off("request", onRequest);
      await page.setRequestInterception(false).catch(() => null);
      // NOTE: Page cleanup is handled by the caller (e.g., enter-scores.processor.ts)
      // Do NOT close the page here as it's needed for subsequent operations
    }
  }
}
