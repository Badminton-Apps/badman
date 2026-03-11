import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";

export async function clickSaveButton(
  pupeteer: { page: Page; timeout?: number },
  args?: { logger?: Logger }
): Promise<boolean> {
  const { logger } = args || {};
  logger?.verbose("clickSaveButton");
  const { page, timeout = 5000 } = pupeteer;
  const saveButton = await waitForSelectors([["input#btnSave.button"]], page, timeout);
  if (!saveButton) return false;
  await saveButton.click();
  return true;
}
