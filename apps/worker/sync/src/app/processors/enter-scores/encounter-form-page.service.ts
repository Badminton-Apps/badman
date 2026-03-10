import { EncounterCompetition } from "@badman/backend-database";
import { acceptCookies, getPage, signIn, waitForSelectors } from "@badman/backend-pupeteer";
import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Transaction } from "sequelize";
import {
  clearFields,
  enableInputValidation,
  enterEditMode,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
} from "./pupeteer";
import { enterGames } from "./pupeteer/enterGames";

/**
 * Page object service for the toernooi.nl score-entry form.
 *
 * Wraps all Puppeteer interactions needed by EnterScoresProcessor so that
 * the processor can be tested by injecting a mock of this service.
 */
@Injectable()
export class EncounterFormPageService {
  private readonly logger = new Logger(EncounterFormPageService.name);
  private page: Page | null = null;

  async open(headless: boolean, flags: string[]): Promise<void> {
    this.page = await getPage(headless, flags);
    if (!this.page) {
      throw new Error("Failed to create browser page");
    }
    this.page.setDefaultTimeout(30000);
    await this.page.setViewport({ width: 1691, height: 1337 });
  }

  async close(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    this.page = null;
  }

  async acceptCookies(timeout = 20000): Promise<void> {
    this._assertPage();
    await acceptCookies({ page: this.page!, timeout }, { logger: this.logger });
  }

  async signIn(
    username: string | undefined,
    password: string | undefined,
    timeout = 20000
  ): Promise<void> {
    this._assertPage();
    await signIn(
      { page: this.page!, timeout },
      { username, password, logger: this.logger }
    );
  }

  async waitForSignInConfirmation(timeout = 5000): Promise<boolean> {
    this._assertPage();
    const el = await this.page!.waitForSelector("#profileMenu", { timeout });
    return !!el;
  }

  async enterEditMode(encounter: EncounterCompetition): Promise<void> {
    this._assertPage();
    await enterEditMode({ page: this.page! }, encounter);
  }

  async clearFields(): Promise<void> {
    this._assertPage();
    await clearFields({ page: this.page! }, { logger: this.logger });
  }

  async enterGames(encounter: EncounterCompetition, transaction: Transaction): Promise<void> {
    this._assertPage();
    await enterGames(
      { page: this.page! },
      { encounter, logger: this.logger, transaction }
    );
  }

  async enterGameLeader(fullName: string): Promise<void> {
    this._assertPage();
    await enterGameLeader({ page: this.page! }, fullName);
  }

  async enterShuttle(shuttle: string): Promise<void> {
    this._assertPage();
    await enterShuttle({ page: this.page! }, shuttle);
  }

  async enterStartHour(hour: string): Promise<void> {
    this._assertPage();
    await enterStartHour({ page: this.page! }, hour);
  }

  async enterEndHour(hour: string): Promise<void> {
    this._assertPage();
    await enterEndHour({ page: this.page! }, hour);
  }

  async enableInputValidation(): Promise<void> {
    this._assertPage();
    await enableInputValidation({ page: this.page! }, this.logger);
  }

  async getRowErrorMessages(): Promise<string[]> {
    this._assertPage();
    return this.page!.evaluate(() => {
      const messageElements = document.querySelectorAll("div.submatchrow_message");
      const messages: string[] = [];
      messageElements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) messages.push(text);
      });
      return messages;
    });
  }

  getCurrentUrl(): string {
    this._assertPage();
    return this.page!.url();
  }

  /**
   * Finds and clicks the save button.
   * @returns `true` if the button was found and clicked, `false` if not found.
   */
  async clickSaveButton(timeout = 5000): Promise<boolean> {
    this._assertPage();
    const saveButton = await waitForSelectors([["input#btnSave.button"]], this.page!, timeout);
    if (!saveButton) return false;
    await saveButton.click();
    return true;
  }

  async waitForNavigation(opts: { waitUntil: "networkidle0" | "load" | "domcontentloaded"; timeout: number }): Promise<void> {
    this._assertPage();
    await this.page!.waitForNavigation(opts);
  }

  async waitForNetworkIdle(opts: { idleTime: number; timeout: number }): Promise<void> {
    this._assertPage();
    await this.page!.waitForNetworkIdle(opts);
  }

  private _assertPage(): void {
    if (!this.page) {
      throw new Error("Page not open — call open() first");
    }
  }
}
