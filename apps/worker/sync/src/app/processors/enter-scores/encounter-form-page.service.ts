import { EncounterCompetition } from "@badman/backend-database";
import { acceptCookies, getPage, signIn } from "@badman/backend-pupeteer";
import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Transaction } from "sequelize";
import {
  clearFields,
  clickSaveButton,
  enableInputValidation,
  enterEditMode,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
  getCurrentUrl,
  getRowErrorMessages,
  waitForNavigation,
  waitForNetworkIdle,
  waitForSignInConfirmation,
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
  private _unhandledRejectionHandler: ((reason: unknown) => void) | null = null;

  async open(headless: boolean, flags: string[]): Promise<void> {
    this.page = await getPage(headless, flags);
    if (!this.page) {
      throw new Error("Failed to create browser page");
    }
    this.page.setDefaultTimeout(30000);
    await this.page.setViewport({ width: 1691, height: 1337 });

    this._installUnhandledRejectionGuard();
  }

  async close(): Promise<void> {
    this._removeUnhandledRejectionGuard();

    const pageToClose = this.page;
    if (pageToClose && !pageToClose.isClosed()) {
      await new Promise((r) => setTimeout(r, 150));
      await pageToClose.close();
    }
    if (this.page === pageToClose) {
      this.page = null;
    }
  }

  /**
   * Catches unhandled ProtocolError rejections from internal Puppeteer frame initialization
   * (FrameManager.onAttachedToTarget -> Network.enable / Page.addScriptToEvaluateOnNewDocument).
   * These are fire-and-forget inside Puppeteer and can't be caught via the Page API.
   */
  private _installUnhandledRejectionGuard(): void {
    this._unhandledRejectionHandler = (reason: unknown) => {
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (
        msg.includes("protocolTimeout") ||
        msg.includes("Network.enable timed out") ||
        msg.includes("Page.addScriptToEvaluateOnNewDocument timed out")
      ) {
        this.logger.warn(
          `Suppressed internal Puppeteer ProtocolError (non-fatal): ${msg}`
        );
        return;
      }
    };
    process.on("unhandledRejection", this._unhandledRejectionHandler);
  }

  private _removeUnhandledRejectionGuard(): void {
    if (this._unhandledRejectionHandler) {
      process.removeListener("unhandledRejection", this._unhandledRejectionHandler);
      this._unhandledRejectionHandler = null;
    }
  }

  /** True if a page is open and not closed (e.g. for defensive reopen at job start). */
  hasPage(): boolean {
    return this.page != null && !this.page.isClosed();
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
    return waitForSignInConfirmation(
      { page: this.page!, timeout },
      { logger: this.logger }
    );
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
    return getRowErrorMessages({ page: this.page! }, { logger: this.logger });
  }

  getCurrentUrl(): string {
    this._assertPage();
    return getCurrentUrl({ page: this.page! }, { logger: this.logger });
  }

  /**
   * Finds and clicks the save button.
   * @returns `true` if the button was found and clicked, `false` if not found.
   */
  async clickSaveButton(timeout = 5000): Promise<boolean> {
    this._assertPage();
    return clickSaveButton({ page: this.page!, timeout }, { logger: this.logger });
  }

  async waitForNavigation(opts: { waitUntil: "networkidle0" | "load" | "domcontentloaded"; timeout: number }): Promise<void> {
    this._assertPage();
    await waitForNavigation({ page: this.page! }, opts, { logger: this.logger });
  }

  async waitForNetworkIdle(opts: { idleTime: number; timeout: number }): Promise<void> {
    this._assertPage();
    await waitForNetworkIdle({ page: this.page! }, opts, { logger: this.logger });
  }

  private _assertPage(): void {
    if (this.page != null && this.page.isClosed()) {
      this.page = null;
      throw new Error(
        "Page was closed (e.g. browser restarted or crashed). Retry the job for a fresh page."
      );
    }
    if (!this.page) {
      throw new Error("Page not open — call open() first");
    }
  }
}
