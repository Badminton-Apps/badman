import { Page } from "puppeteer";
import { Logger } from "@nestjs/common";

export async function detailComment(
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
  logger?.verbose("detailComment");
  const { page } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }

  try {
    // Check if page is still connected
    if (page.isClosed()) {
      logger?.debug("Page is closed, cannot check for comments");
      return { hasComment: false };
    }

    const selector = ".content .wrapper--legacy table";
    let hasComment = false;

    // Use page.$$eval to avoid element handle disposal issues
    const hasCommentResult = await page.$$eval(selector, (tables) => {
      // iterate over tables find where caption contains 'Opmerkingen'
      for (const table of tables) {
        const caption = table.querySelector("caption");
        if (!caption) {
          continue;
        }

        const captionTxt = caption.textContent;
        if (!captionTxt || captionTxt.indexOf("Opmerkingen") === -1) {
          continue;
        }

        // if selector exists, check if tbody has more than 1 row
        const rows = table.querySelectorAll("tr");
        if (rows.length > 1) {
          return true; // Found comment
        }
      }
      return false; // No comment found
    });

    hasComment = hasCommentResult;
    return { hasComment };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Handle disposed element handles, page closure, or destroyed execution context
    if (
      msg.includes("disposed") ||
      msg.includes("closed") ||
      msg.includes("Target closed") ||
      msg.includes("Execution context was destroyed")
    ) {
      logger?.debug(
        "Page or context was disposed/destroyed while checking for comments, assuming no comment"
      );
      return { hasComment: false };
    }

    // Re-throw other errors
    logger?.error("Error in detailComment:", msg);
    throw error;
  }
}
