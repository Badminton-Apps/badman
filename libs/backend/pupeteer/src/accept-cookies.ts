import { HTTPRequest, Page } from "puppeteer";
import { waitForSelectors } from "./shared";
import { Logger } from "@nestjs/common";
import { ToernooiUnreachableError } from "./errors";

const SITE_UNREACHABLE_PATTERNS = [
  "net::ERR_NAME_NOT_RESOLVED",
  "net::ERR_CONNECTION_REFUSED",
  "net::ERR_CONNECTION_RESET",
  "net::ERR_CONNECTION_CLOSED",
  "net::ERR_NETWORK",
  "net::ERR_EMPTY_RESPONSE",
  "Navigation timeout",
  "TimeoutError",
];

const NOT_SITE_UNREACHABLE_PATTERNS = [
  "net::ERR_HTTP",
  "net::ERR_CERT",
  "net::ERR_SSL",
  "Target closed",
  "frame",
  "detached",
];

function isSiteUnreachableError(message: string): boolean {
  const lower = message.toLowerCase();
  if (NOT_SITE_UNREACHABLE_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
    return false;
  }
  return SITE_UNREACHABLE_PATTERNS.some((p) => message.includes(p));
}

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

      action.catch(() => {});
    }
  };

  await page.setRequestInterception(true);
  page.on("request", onRequest);

  try {
    {
      try {
        await page.goto("https://www.toernooi.nl/cookiewall/", {
          waitUntil: "domcontentloaded",
          timeout: (timeout || 5000) * 3,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        // ERR_ABORTED on the cookiewall URL typically means the site redirected
        // us away because cookies were already accepted in this browser session.
        if (message.includes("net::ERR_ABORTED")) {
          const currentUrl = page.url();
          if (currentUrl.includes("toernooi.nl") && !currentUrl.includes("cookiewall")) {
            logger?.debug(
              `Cookie wall navigation aborted (redirected to ${currentUrl}) — cookies likely already accepted`
            );
            return;
          }
        }

        if (isSiteUnreachableError(message)) {
          throw new ToernooiUnreachableError(
            `Toernooi.nl unreachable: ${message}`,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
    {
      // Use non-throwing probe: when cookies are already accepted (shared browser
      // session), the cookie wall page loads without accept buttons.
      const element = await page.$(
        'button[type="submit"], button.btn.btn--success.js-accept-basic'
      );
      if (!element) {
        logger?.debug("Cookie accept buttons not found — cookies likely already accepted, skipping");
        return;
      }
      await element.click({ offset: { x: 1.890625, y: 21.453125 } });
      const navTimeout = (timeout || 5000) * 2;
      try {
        await Promise.race([
          page.waitForNavigation({ timeout: navTimeout }),
          page.waitForNetworkIdle({ idleTime: 500, timeout: navTimeout }).catch(() => null),
        ]);
      } catch (error: unknown) {
        logger?.warn(
          "Cookie button click: navigation and network idle both failed or timed out, continuing anyway:",
          error instanceof Error ? error.message : error
        );
      }
    }

    {
      // Wait for the page to be idle first
      logger?.debug("waiting for network idle");
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: timeout });
        logger?.debug("network idle");
      } catch (error: any) {
        logger?.warn("Network idle timeout, continuing anyway:", error?.message || error);
      }

      // Check for consent dialog frame without waiting
      const consentDialogFrame = await page.$(
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
              try {
                await page.waitForNavigation({
                  timeout: (timeout || 5000) * 2,
                });
              } catch (error: unknown) {
                if (error instanceof Error && (error.message?.includes("detached") || error.message?.includes("Frame"))) {
                  logger?.debug("Frame detached - page may have already navigated:", error.message);
                } else {
                  logger?.debug(
                    "Navigation after consent click timeout:",
                    error instanceof Error ? error.message : error
                  );
                }
              }
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
        await page.waitForNetworkIdle({ idleTime: 300, timeout: 2000 });
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
