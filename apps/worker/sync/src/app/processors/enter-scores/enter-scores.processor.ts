import { SyncQueue, Sync, TransactionManager } from "@badman/backend-queue";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bull";
import { ConfigType } from "@badman/utils";
import { EnterScoresRepository } from "./repository";
import { EnterScoresBrowserService, BrowserConfig } from "./browser.service";
import { EnterScoresValidationService } from "./validation.service";
import { EnterScoresNotificationService } from "./notification.service";

@Processor({
  name: SyncQueue,
})
export class EnterScoresProcessor {
  private readonly logger = new Logger(EnterScoresProcessor.name);
  private readonly _username?: string;
  private readonly _password?: string;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly _transactionManager: TransactionManager,
    private readonly repository: EnterScoresRepository,
    private readonly browserService: EnterScoresBrowserService,
    private readonly validationService: EnterScoresValidationService,
    private readonly notificationService: EnterScoresNotificationService
  ) {
    this._username = configService.get("VR_API_USER");
    this._password = configService.get("VR_API_PASS");
  }

  private getBrowserConfig(): BrowserConfig {
    const visualSyncEnabled = this.configService.get("VISUAL_SYNC_ENABLED") === true;
    const hangBeforeBrowserCleanup = this.configService.get("HANG_BEFORE_BROWSER_CLEANUP") === true;

    return {
      headless: !visualSyncEnabled,
      username: this._username!,
      password: this._password!,
      hangBeforeBrowserCleanup,
    };
  }

  private shouldSaveScores(): boolean {
    const nodeEnv = process.env.NODE_ENV;
    const enterScoresEnabled = this.configService.get("ENTER_SCORES_ENABLED") === true;
    return nodeEnv === "production" || enterScoresEnabled;
  }

  @Process({
    name: Sync.EnterScores,
  })
  async enterScores(job: Job<{ encounterId: string }>) {
    this.logger.log(
      `🚀 Starting EnterScores job ${job.id} for encounter ${job.data.encounterId} (PID: ${process.pid})`
    );

    const { encounterId } = job.data;
    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    // Validate credentials
    const credentialsValidation = this.validationService.validateCredentials(
      this._username,
      this._password
    );
    if (!credentialsValidation.isValid) {
      this.logger.error("Credentials validation failed:", credentialsValidation.errors.join(", "));
      return;
    }

    let encounter = null;
    let browserInitialized = false;

    try {
      // Fetch encounter data
      encounter = await this.repository.getEncounterById(encounterId);

      // Validate encounter
      const encounterValidation = this.validationService.validateEncounter(encounter);
      if (!encounterValidation.isValid) {
        this.validationService.logValidationResult(encounterValidation, "Encounter");
        return;
      }

      this.logger.log(
        `Entering scores for encounter: Visual Code: ${encounter!.visualCode}, ID: ${encounterId}`
      );

      // Initialize browser
      const browserConfig = this.getBrowserConfig();
      await this.browserService.initializeBrowser(browserConfig);
      browserInitialized = true;

      // Browser workflow
      await this.executeBrowserWorkflow(encounter!, browserConfig);

      // Send success notification
      await this.sendSuccessNotification(encounter!, devEmailDestination);
    } catch (error) {
      await this.handleError(error, encounterId, encounter, devEmailDestination);
    } finally {
      if (browserInitialized) {
        const browserConfig = this.getBrowserConfig();
        await this.browserService.cleanup(browserConfig.hangBeforeBrowserCleanup);
      }
    }
  }

  private async executeBrowserWorkflow(
    encounter: any,
    browserConfig: BrowserConfig
  ): Promise<void> {
    // Accept cookies
    this.logger.verbose("Accepting cookies");
    await this.browserService.acceptCookies();

    // Sign in
    this.logger.verbose("Signing in");
    await this.browserService.signIn(browserConfig.username, browserConfig.password);

    // Enter edit mode
    this.logger.verbose("Entering edit mode");
    await this.browserService.enterEditMode(encounter);

    // Clear fields
    this.logger.verbose("Clearing fields");
    await this.browserService.clearFields();

    // Enter games with transaction
    this.logger.verbose("Entering games with transaction");
    await this.executeGamesTransaction(encounter);

    // Enter additional data
    this.logger.verbose("Entering additional data");
    await this.enterAdditionalData(encounter);

    // Validate and save
    this.logger.verbose("Validating and saving");
    await this.validateAndSave();
  }

  private async executeGamesTransaction(encounter: any): Promise<void> {
    const transactionId = await this._transactionManager.transaction();
    const transaction = await this._transactionManager.getTransaction(transactionId);

    try {
      await this.browserService.enterGames(encounter, transaction);
      await this._transactionManager.commitTransaction(transactionId);
    } catch (error) {
      this.logger.error(
        "Error during enterGames, rolling back transaction:",
        error?.message || error
      );
      await this._transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }

  private async enterAdditionalData(encounter: any): Promise<void> {
    if (encounter.gameLeader?.fullName) {
      await this.browserService.enterGameLeader(encounter.gameLeader.fullName);
    }

    if (encounter.shuttle) {
      await this.browserService.enterShuttle(encounter.shuttle);
    }

    if (encounter.startHour) {
      await this.browserService.enterStartHour(encounter.startHour);
    }

    if (encounter.endHour) {
      await this.browserService.enterEndHour(encounter.endHour);
    }
  }

  private async validateAndSave(): Promise<void> {
    await this.browserService.enableInputValidation();
    await this.browserService.validateRowMessages();

    if (this.shouldSaveScores()) {
      await this.browserService.clickSaveButton();
      this.logger.log("✅ Scores saved successfully");
    }
  }

  private async sendSuccessNotification(
    encounter: any,
    devEmailDestination?: string
  ): Promise<void> {
    if (!this.notificationService.shouldSendNotification(devEmailDestination)) {
      this.notificationService.logNotificationSkipped(
        "success",
        encounter.visualCode || encounter.id
      );
      return;
    }

    try {
      const recipient = this.notificationService.createDevRecipient(devEmailDestination!);
      const toernooiUrl = this.repository.constructToernooiUrl(encounter);
      await this.notificationService.sendSuccessNotification(encounter, recipient, toernooiUrl);
    } catch (emailError) {
      this.logger.error("Failed to send success email:", emailError?.message || emailError);
    }
  }

  private async handleError(
    error: any,
    encounterId: string,
    encounter: any,
    devEmailDestination?: string
  ): Promise<void> {
    // Send failure notification first
    if (this.notificationService.shouldSendNotification(devEmailDestination)) {
      try {
        const recipient = this.notificationService.createDevRecipient(devEmailDestination!);
        const toernooiUrl = this.repository.constructToernooiUrl(encounter);
        await this.notificationService.sendFailureNotification(
          encounterId,
          error?.message || String(error),
          recipient,
          encounter?.visualCode,
          toernooiUrl
        );
      } catch (emailError) {
        this.logger.error("Failed to send failure email:", emailError?.message || emailError);
      }
    } else {
      const encounterInfo = encounter?.visualCode || encounterId;
      this.notificationService.logNotificationSkipped("failure", encounterInfo);
    }

    // Handle error for Bull queue
    if (this.validationService.isTimeoutError(error)) {
      this.logger.warn("Timeout error occurred - job will be retried:", error?.message || error);
    } else {
      this.logger.error(
        "Error during enter scores process - job will be retried:",
        error?.message || error
      );
    }

    // Re-throw all errors so Bull can retry the job
    throw error;
  }
}
