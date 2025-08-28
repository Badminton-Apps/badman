import { ElementHandle, Page } from "puppeteer";
import { selectOptionByValue } from "../utils/selectSelectOption";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";

export async function addUnknownPlayer(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  option: ElementHandle,
  memberId: string,
  logger: Logger
) {
  logger.debug(`Adding unknown player ${memberId} to team`);
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error("No page provided");
  }
  await selectOptionByValue(option, "-1000");

  try {
    // Wait for the dialog to appear
    await waitForSelectors([['[aria-describedby="dlgTeamPlayers"]']], page, timeout);
    logger.debug("Dialog with aria-describedby='dlgTeamPlayers' appeared");

    // Wait for the input with id="playersuggest" to be visible
    await waitForSelectors([["#playersuggest"]], page, timeout);
    const playerInput = await page.$("#playersuggest");

    if (!playerInput) {
      throw new Error("Player suggest input not found");
    }

    // Select and fill the input with memberId
    await playerInput.click();
    await playerInput.type(memberId);
    logger.debug(`Typed memberId: ${memberId} into player suggest input`);

    // Wait for the suggestion list to appear
    await waitForSelectors([["#ulSearchSuggest"]], page, timeout);

    // Wait for the li element with an a tag inside
    await waitForSelectors([["#ulSearchSuggest li a"]], page, timeout);

    const suggestionLink = await page.$("#ulSearchSuggest li a");
    if (!suggestionLink) {
      throw new Error("Suggestion link not found");
    }

    // Get the bounding box to find the middle of the element
    const boundingBox = await suggestionLink.boundingBox();
    if (!boundingBox) {
      throw new Error("Could not get bounding box for suggestion link");
    }

    // Click in the middle of the element
    const x = boundingBox.x + boundingBox.width / 2;
    const y = boundingBox.y + boundingBox.height / 2;
    await page.mouse.click(x, y);
    logger.debug("Clicked on suggestion link");

    // Wait for and click the submit button
    await waitForSelectors([['input[type="submit"]']], page, timeout);
    const submitButton = await page.$('input[type="submit"]');

    if (!submitButton) {
      throw new Error("Submit button not found");
    }

    await submitButton.click();
    logger.debug("Clicked submit button");

    // Wait for and find the select element with id="teamPlayers"
    await waitForSelectors([["#teamplayers"]], page, timeout);
    const teamPlayersSelect = await page.$("#teamplayers");

    if (!teamPlayersSelect) {
      throw new Error("Team players select not found");
    }
    // Find the option that contains the memberId

    logger.debug(`Waiting for option with memberId: ${memberId}`);
    await page.waitForFunction(
      (substring) => {
        const teamSelect = document.querySelector("#teamplayers");
        console.log("teamSelect", teamSelect);
        if (!teamSelect) return false;
        const options = Array.from(teamSelect.querySelectorAll("option"));
        console.log("options", options);
        for (const option of options) {
          if (option.textContent && option.textContent.includes(substring)) {
            console.log("option found", option);
            return true;
          }
        }
        return false;
      },
      { timeout: 5000 },
      memberId.toString()
    );
    logger.debug(`Found option with memberId: ${memberId}`);

    const options = await teamPlayersSelect.$$("option");

    let targetOption = null;

    for (const option of options) {
      const textContent = await page.evaluate((el) => el.textContent, option);
      logger.debug(`Checking option: ${textContent} for memberId: ${memberId}`);
      if (textContent && textContent.includes(memberId.toString())) {
        targetOption = option;
        logger.debug(`Found matching option: ${textContent}`);
        break;
      }
    }

    if (!targetOption) {
      throw new Error(`Option with memberId ${memberId} not found in team players select`);
    }

    // Click the middle of the target option
    const optionBoundingBox = await targetOption.boundingBox();
    if (!optionBoundingBox) {
      throw new Error("Could not get bounding box for target option");
    }

    const optionX = optionBoundingBox.x + optionBoundingBox.width / 2;
    const optionY = optionBoundingBox.y + optionBoundingBox.height / 2;
    await page.mouse.click(optionX, optionY);
    logger.debug(`Selected option containing memberId: ${memberId}`);

    // Find and click the "Sluiten" button in the dialog buttonset
    await waitForSelectors([[".ui-dialog-buttonset button"]], page, timeout);
    const buttons = await page.$$(".ui-dialog-buttonset button");

    let closeButton = null;
    for (const button of buttons) {
      const buttonText = await page.evaluate((el) => el.textContent, button);
      if (buttonText && buttonText.includes("Sluiten")) {
        closeButton = button;
        break;
      }
    }

    if (!closeButton) {
      throw new Error("Sluiten button not found in dialog buttonset");
    }

    await closeButton.click();
    logger.debug("Clicked Sluiten button");

    // Wait for the dialog to close
    await page.waitForSelector('[aria-describedby="dlgTeamPlayers"]', {
      hidden: true,
      timeout: timeout,
    });
    logger.debug("Dialog closed successfully");
  } catch (error) {
    logger.error(`Error in addUnknownPlayer: ${error.message}`);
    throw error;
  }
}
