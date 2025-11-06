import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { EncounterCompetition } from "@badman/backend-database";
import { waitForSelectors } from "@badman/backend-pupeteer";

@Injectable()
export class ToernooiNavigationService {
  private readonly logger = new Logger(ToernooiNavigationService.name);

  /**
   * Navigate to the match result edit page
   */
  async navigateToMatchEditPage(page: Page, encounter: EncounterCompetition): Promise<void> {
    const matchId = encounter.visualCode;
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;

    await page.goto(
      `https://www.toernooi.nl/sport/matchresult.aspx?id=${eventId}&match=${matchId}`
    );
  }

  /**
   * Click the save button and handle navigation
   */
  async clickSaveButton(page: Page, timeout: number = 5000): Promise<void> {
    const saveButton = await waitForSelectors([["input#btnSave.button"]], page, timeout);
    if (!saveButton) {
      throw new Error("Save button not found");
    }

    await saveButton.click();

    // Handle navigation with proper timeout and error handling
    try {
      await page.waitForNavigation({
        waitUntil: "networkidle0",
        timeout: 45000, // 45 seconds for save navigation
      });
    } catch (navigationError: any) {
      // Try alternative wait strategies
      try {
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
      } catch (networkError: any) {
        // Final fallback - just wait and check URL
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const currentUrl = page.url();
      }
    }
  }
}
