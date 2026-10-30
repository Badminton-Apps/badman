import { EncounterComment } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { mapCommentRows } from "../comment-rows";

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
): Promise<{ hasComment: boolean; comments: EncounterComment[] }> {
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
      return { hasComment: false, comments: [] };
    }

    const selector = ".content .wrapper--legacy table";

    // Use page.$$eval to avoid element handle disposal issues
    const rawRows = await page.$$eval(selector, (tables) => {
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

        // Only the body rows hold comments, the header row describes the columns
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map((row) =>
          Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent ?? "")
        );
      }
      return [] as string[][];
    });

    const comments = mapCommentRows(rawRows);
    return { hasComment: comments.length > 0, comments };
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
      return { hasComment: false, comments: [] };
    }

    // Re-throw other errors
    logger?.error("Error in detailComment:", msg);
    throw error;
  }
}
