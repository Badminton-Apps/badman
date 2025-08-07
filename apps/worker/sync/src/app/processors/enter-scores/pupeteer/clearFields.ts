import { Page } from "puppeteer";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";

export async function clearFields(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  args: {
    logger?: Logger;
  }
) {
  const { page, timeout } = pupeteer;
  const { logger } = args || {};
  logger?.verbose("clearFields");

  if (!page) {
    throw new Error("No page provided");
  }

  {
    const targetPage = page;
    await targetPage.evaluate(
      (x, y) => {
        window.scroll(x, y);
      },
      0,
      595
    );
  }
  {
    const targetPage = page;
    const veldenLegenButton = await waitForSelectors(
      [['input[value=\\"Velden legen\\"]'], ["#btnResetSubMatches"]],
      targetPage,
      timeout
    );
    logger.debug("empty fields button found", !!veldenLegenButton);

    // Handle any dialogs (like password change alerts)
    targetPage.on("dialog", async (dialog) => {
      logger.debug("Dialog message:", dialog.message());
      await dialog.accept();
    });

    // Click the element
    await veldenLegenButton.click();
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        ["aria/Ja"],
        [
          "#bdBase > div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front.dialogerror.ui-draggable.ui-dialog-buttons > div.ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix > div > button:nth-child(1)",
        ],
      ],
      targetPage,
      timeout
    );
    await element.click({ offset: { x: 16.859375, y: 7.5 } });
  }
  {
    const targetPage = page;
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById("matchfield_1")).value = "")
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById("matchfield_2")).value = "")
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById("matchfield_3")).value = "")
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById("matchfield_4")).value = "")
    );
  }
  {
    const targetPage = page;
    await targetPage.evaluate(
      (x, y) => {
        window.scroll(x, y);
      },
      0,
      0
    );
  }
}
