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

  // 🔧 SAFETY: Wrap entire function in try-catch to prevent any unhandled errors
  try {
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

      // 🔧 FIX: Wrap navigation in proper error handling to prevent process crash
      try {
        // Set up navigation promise with better timeout handling
        const navigationPromise = targetPage
          .waitForNavigation({
            timeout: (timeout || 5000) * 3,
            waitUntil: "networkidle0", // Wait for network to be idle
          })
          .catch((error) => {
            logger?.warn("Initial navigation timeout (expected):", error?.message || error);
            return null; // Don't throw, return null to continue
          });

        // Navigate to cookie wall
        await targetPage.goto("https://www.toernooi.nl/cookiewall/", {
          waitUntil: "domcontentloaded", // Don't wait for everything, just DOM
          timeout: (timeout || 5000) * 2,
        });

        // Wait for navigation but don't fail if it times out
        await navigationPromise;

        logger?.debug("Initial navigation completed successfully");
      } catch (error: any) {
        // 🔧 CRITICAL: Log but don't re-throw - prevents process crash
        logger?.warn(
          "Initial page load failed, but continuing with cookie acceptance:",
          error?.message || error
        );

        // Try to ensure we're at least on some version of the page
        try {
          await targetPage.waitForSelector("body", { timeout: 2000 });
        } catch (bodyError) {
          logger?.error("Could not find page body, cookie acceptance may fail");
          throw new Error(`Failed to load cookie page: ${error?.message || error}`);
        }
      }
    }
    {
      const targetPage = page;

      // 🔧 FIX: Better error handling for cookie button interaction
      try {
        // Find the cookie acceptance button
        const element = await waitForSelectors(
          [['button[type="submit"]'], ["button.btn.btn--success.js-accept-basic"]],
          targetPage,
          timeout
        );

        if (!element) {
          throw new Error("Cookie acceptance button not found");
        }

        // Set up navigation promise with proper error handling
        const navigationPromise = targetPage
          .waitForNavigation({
            timeout: (timeout || 5000) * 2,
            waitUntil: "networkidle0",
          })
          .catch((error) => {
            logger?.warn(
              "Cookie button navigation timeout (may be expected):",
              error?.message || error
            );
            return null; // Don't throw, just return null
          });

        // Click the cookie button
        await element.click({ offset: { x: 1.890625, y: 21.453125 } });
        logger?.debug("Cookie acceptance button clicked");

        // Wait for navigation but don't fail the entire process if it times out
        await navigationPromise;
      } catch (error: any) {
        // 🔧 CRITICAL: Handle button click failures gracefully
        logger?.warn("Cookie button interaction failed, but continuing:", error?.message || error);

        // Try alternative cookie acceptance methods
        try {
          // Look for any accept button as fallback
          const fallbackButton = await targetPage.$(
            'button[type="submit"], .btn-success, [data-accept="true"]'
          );
          if (fallbackButton) {
            logger?.debug("Found fallback cookie button, attempting click");
            await fallbackButton.click();
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Give it a moment
          }
        } catch (fallbackError) {
          logger?.debug(
            "Fallback cookie acceptance also failed:",
            (fallbackError as any)?.message || fallbackError
          );
          // Don't throw here - continue with the process
        }
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
                .catch((error) => {
                  logger?.debug("Navigation after consent click timeout:", error?.message || error);
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

    // 🔧 SAFETY: Catch any remaining unhandled errors
  } catch (error: any) {
    logger?.error("🚨 Critical error in acceptCookies function:", {
      message: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });

    // 🔧 IMPORTANT: Re-throw with more context but ensure it's a proper Error object
    const wrappedError = new Error(`Cookie acceptance failed: ${error?.message || error}`);
    wrappedError.name = "CookieAcceptanceError";
    // Store original error in a compatible way
    (wrappedError as any).originalError = error;

    throw wrappedError;
  }
}
