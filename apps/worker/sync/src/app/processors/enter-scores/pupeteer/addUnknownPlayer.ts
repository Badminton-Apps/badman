import { ElementHandle, Page } from "puppeteer";
import { selectOptionByValue } from "../utils/selectSelectOption";
import { waitForSelectors } from "@badman/backend-pupeteer";
import { Logger } from "@nestjs/common";

const SUGGEST_ATTEMPTS = 3;
const SUGGEST_TIMEOUT = 10000;
/** Time for the debounced autocomplete to replace a list rendered for a partial memberId. */
const SUGGEST_SETTLE_MS = 1000;

async function suggestionTexts(page: Page): Promise<{ link: ElementHandle; text: string }[]> {
  const links = await page.$$("#ulSearchSuggest li a");
  return Promise.all(
    links.map(async (link) => ({
      link,
      text: (await page.evaluate((el) => el.textContent, link)) ?? "",
    }))
  );
}

/** Whole-token match, so memberId 5012 does not match a suggestion for 50123. */
function showsMemberId(text: string, memberId: string): boolean {
  return text.split(/[^\p{L}\p{N}]+/u).includes(memberId);
}

/**
 * Picks the suggestion for this player: one whose text contains the memberId, or a single
 * suggestion that is still the same after the list had time to settle. Returns null when the
 * list is ambiguous, so a stale or partial-match entry is never clicked.
 */
async function pickSuggestion(page: Page, memberId: string, logger?: Logger) {
  const first = await suggestionTexts(page);
  const match = first.find((s) => showsMemberId(s.text, memberId));
  if (match) return match.link;

  await new Promise((resolve) => setTimeout(resolve, SUGGEST_SETTLE_MS));
  const settled = await suggestionTexts(page);
  const settledMatch = settled.find((s) => showsMemberId(s.text, memberId));
  if (settledMatch) return settledMatch.link;
  if (settled.length === 1 && first.length === 1 && settled[0].text === first[0].text) {
    logger?.warn(
      `Suggestion "${settled[0].text.trim()}" does not show memberId ${memberId}; using the only suggestion`
    );
    return settled[0].link;
  }
  logger?.warn(
    `No unambiguous suggestion for memberId ${memberId}: ${settled.map((s) => `"${s.text.trim()}"`).join(", ") || "none"}`
  );
  return null;
}

/**
 * Types the memberId into the dialog's search box and returns the suggestion for that player.
 * The TS autocomplete is debounced and Ajax-backed, so retry with a cleared field and
 * slower typing before giving up with an error that names the player.
 */
export async function findPlayerSuggestion(
  page: Page,
  memberId: string,
  timeout = 5000,
  logger?: Logger
): Promise<ElementHandle> {
  await waitForSelectors([["#playersuggest"]], page, timeout);

  for (let attempt = 1; attempt <= SUGGEST_ATTEMPTS; attempt++) {
    const playerInput = await page.$("#playersuggest");
    if (!playerInput) {
      throw new Error("Player suggest input not found");
    }

    await playerInput.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await playerInput.type(memberId, { delay: 50 });
    logger?.debug(`Typed memberId: ${memberId} (attempt ${attempt}/${SUGGEST_ATTEMPTS})`);

    try {
      await waitForSelectors([["#ulSearchSuggest li a"]], page, SUGGEST_TIMEOUT);
      const suggestionLink = await pickSuggestion(page, memberId, logger);
      if (suggestionLink) {
        return suggestionLink;
      }
    } catch (error) {
      logger?.warn(
        `No suggestion for memberId ${memberId} (attempt ${attempt}/${SUGGEST_ATTEMPTS}): ${(error as Error).message}`
      );
    }
  }

  throw new Error(
    `TS returned no player suggestion for memberId ${memberId} after ${SUGGEST_ATTEMPTS} attempts`
  );
}

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

    const suggestionLink = await findPlayerSuggestion(page, memberId, timeout, logger);

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
        console.log("teamSelect found:", !!teamSelect);
        if (!teamSelect) return false;
        const options = Array.from(teamSelect.querySelectorAll("option"));
        console.log("options count:", options.length);
        for (const option of options) {
          if (option.textContent && option.textContent.includes(substring)) {
            console.log("option found with text:", option.textContent);
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
