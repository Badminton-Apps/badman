import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

/**
 * Waits for the toernooi.nl "Foutmelding" (error) dialog that appears after clicking save
 * when the server rejects the submission (e.g. "DE4: Catry, Petra heeft te veel wedstrijden gespeeld.").
 * The dialog content is in #dlgError (class .dialogerror on the container).
 *
 * @returns The error message text from the dialog, or null if timeout is reached before the dialog appears.
 */
export async function waitForSaveErrorDialog(
  pupeteer: { page: Page; timeout?: number },
  args?: { logger?: Logger }
): Promise<string | null> {
  const { logger } = args ?? {};
  const { page, timeout = 4000 } = pupeteer;
  logger?.debug("waitForSaveErrorDialog: waiting for #dlgError (save error dialog)");
  try {
    const el = await page.waitForSelector("#dlgError", {
      visible: true,
      timeout,
    });
    if (!el) return null;
    const text = await el.evaluate((node) => {
      const raw = node.textContent ?? "";
      return raw.replace(/\s+/g, " ").trim();
    });
    logger?.warn("Save error dialog appeared", { message: text });
    return text || null;
  } catch {
    return null;
  }
}
