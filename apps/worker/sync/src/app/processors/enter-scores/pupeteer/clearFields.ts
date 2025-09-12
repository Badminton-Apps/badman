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
      [["#btnResetSubMatches"]],
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
    logger?.debug("Clicked reset sub matches button");
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
    logger?.debug("Confirmed dialog to reset fields");
  }
  {
    const targetPage = page;

    // Check if all required form fields exist before attempting to clear them
    const fieldsExist = await targetPage.evaluate(() => {
      const field1 = document.getElementById("matchfield_1");
      const field2 = document.getElementById("matchfield_2");
      const field3 = document.getElementById("matchfield_3");
      const field4 = document.getElementById("matchfield_4");

      return field1 && field2 && field3 && field4;
    });

    if (!fieldsExist) {
      const error =
        "Required form fields (matchfield_1, matchfield_2, matchfield_3, matchfield_4) do not exist on the page. Cannot proceed with clearing fields.";
      logger?.error(error);
      throw new Error(error);
    }

    logger?.debug("All required form fields found, clearing values");

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

    logger?.debug("Cleared matchfield input values");

    // Wait a moment for the reset to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify that player selection dropdowns are actually cleared
    const remainingSelections = await targetPage.evaluate(() => {
      const selects = Array.from(
        document.querySelectorAll(
          'select[id^="match_"][id$="_t1p1"], select[id^="match_"][id$="_t1p2"], select[id^="match_"][id$="_t2p1"], select[id^="match_"][id$="_t2p2"]'
        )
      );
      const nonEmptySelections: string[] = [];

      selects.forEach((select) => {
        const htmlSelect = select as HTMLSelectElement;
        if (htmlSelect.value && htmlSelect.value !== "0") {
          nonEmptySelections.push(`${htmlSelect.id}="${htmlSelect.value}"`);
        }
      });

      return nonEmptySelections;
    });

    if (remainingSelections.length > 0) {
      logger?.error(
        `clearFields verification failed: ${remainingSelections.length} player selections were not cleared: ${remainingSelections.join(", ")}`
      );
      throw new Error(
        `Field clearing failed: ${remainingSelections.length} player selections remain: ${remainingSelections.join(", ")}`
      );
    } else {
      logger?.debug("clearFields verification passed: all player selections are cleared");
    }
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
