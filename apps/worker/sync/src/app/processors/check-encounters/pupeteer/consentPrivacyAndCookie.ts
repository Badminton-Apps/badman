import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function consentPrivacyAndCookie(
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
  const { logger } = args || {};
  logger?.verbose("accepting cookies");
  const { page } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  {
    const iframeSelector = "/cmp/consentui-";
    const acceptButtonSelector = "#consentui #buttons .btn.green";

    const iframeElement = page.frames().find((frame) => {
      const frameUrl = frame.url();

      return frameUrl.includes(iframeSelector);
    });

    if (iframeElement) {
      logger?.verbose("iframe found, clicking accept button");

      await iframeElement.click(acceptButtonSelector);
    } else {
      logger?.verbose("iframe not found");
    }
  }
}
