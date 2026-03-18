import { EncounterCompetition } from "@badman/backend-database";
import {
  acceptCookies,
  createProtocolTimeoutGuard,
  getPage,
  signIn,
} from "@badman/backend-pupeteer";
import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import {
  acceptEncounter,
  consentPrivacyAndCookie,
  detailAccepted,
  detailComment,
  detailEntered,
  detailInfo,
  gotoEncounterPage,
  hasTime,
} from "./pupeteer";

/**
 * Page object service for the toernooi.nl encounter detail page.
 *
 * Wraps all Puppeteer interactions needed by CheckEncounterProcessor so that
 * the processor can be tested by injecting a mock of this service.
 */
@Injectable()
export class EncounterDetailPageService {
  private readonly logger = new Logger(EncounterDetailPageService.name);
  private page: Page | null = null;
  private readonly _protocolTimeoutGuard = createProtocolTimeoutGuard(this.logger);

  async open(): Promise<void> {
    this.page = await getPage();
    if (!this.page) {
      throw new Error("Failed to create browser page");
    }
    this._protocolTimeoutGuard.install();
    this.page.setDefaultTimeout(10000);
    await this.page.setViewport({ width: 1691, height: 1337 });
  }

  async close(): Promise<void> {
    this._protocolTimeoutGuard.remove();
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    this.page = null;
  }

  isOpen(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  async acceptCookies(): Promise<void> {
    this._assertPage();
    await acceptCookies({ page: this.page! }, { logger: this.logger });
  }

  async gotoEncounterPage(encounter: EncounterCompetition): Promise<string> {
    this._assertPage();
    return gotoEncounterPage({ page: this.page! }, encounter);
  }

  async consentPrivacyAndCookie(): Promise<void> {
    this._assertPage();
    await consentPrivacyAndCookie({ page: this.page! }, { logger: this.logger });
  }

  async hasTime(): Promise<boolean> {
    this._assertPage();
    return hasTime({ page: this.page! }, { logger: this.logger });
  }

  async getDetailEntered(): Promise<{
    entered: boolean;
    enteredOn: Date | null;
    enteredBy: string | null;
  }> {
    this._assertPage();
    return detailEntered({ page: this.page! }, { logger: this.logger });
  }

  async getDetailAccepted(): Promise<{
    accepted: boolean;
    acceptedOn: Date | null;
    acceptedBy: string | null;
  }> {
    this._assertPage();
    return detailAccepted({ page: this.page! }, { logger: this.logger });
  }

  async getDetailComment(): Promise<{ hasComment: boolean }> {
    this._assertPage();
    return detailComment({ page: this.page! }, { logger: this.logger });
  }

  async signIn(username: string | undefined, password: string | undefined): Promise<void> {
    this._assertPage();
    await signIn({ page: this.page! }, { username, password, logger: this.logger });
  }

  async acceptEncounter(): Promise<boolean> {
    this._assertPage();
    return acceptEncounter({ page: this.page! }, { logger: this.logger });
  }

  async getDetailInfo(): Promise<{
    gameLeader: string | null;
    usedShuttle: string | null;
    startedOn: string | null;
    endedOn: string | null;
  }> {
    this._assertPage();
    return detailInfo({ page: this.page! }, { logger: this.logger });
  }

  private _assertPage(): void {
    if (!this.page || this.page.isClosed()) {
      throw new Error("Page not open — call open() first");
    }
  }
}
