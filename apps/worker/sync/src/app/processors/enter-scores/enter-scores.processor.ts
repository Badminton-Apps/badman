import {
  EncounterCompetition,
  Game,
  Player,
  DrawCompetition,
  SubEventCompetition,
  EventCompetition,
  Assembly,
  Team,
} from "@badman/backend-database";
import { SyncQueue, Sync, TransactionManager } from "@badman/backend-queue";
import { MailingService } from "@badman/backend-mailing";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bull";
import { ConfigType } from "@badman/utils";
import * as Sentry from "@sentry/nestjs";
import { startLockRenewal } from "../../utils";
import {
  EnterScoresError,
  EnterScoresErrorCode,
  EnterScoresPhase,
} from "./enter-scores.errors";
import { EncounterFormPageService } from "./encounter-form-page.service";
import { enterScoresPreflight, isFinalAttempt } from "./guards";

@Processor({
  name: SyncQueue,
})
export class EnterScoresProcessor {
  private readonly logger = new Logger(EnterScoresProcessor.name);
  private readonly _username?: string;
  private readonly _password?: string;
  private _currentPhase: EnterScoresPhase = "preflight";

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly _transactionManager: TransactionManager,
    private readonly mailingService: MailingService,
    private readonly formPage: EncounterFormPageService
  ) {
    this._username = configService.get("VR_API_USER");
    this._password = configService.get("VR_API_PASS");
    this.logger.debug("Enter scores processor initialized");
  }

  private constructToernooiUrl(encounter: EncounterCompetition | null): string | undefined {
    if (!encounter) return undefined;

    const matchId = encounter.visualCode;
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;

    if (!matchId || !eventId) return undefined;

    return `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;
  }

  private isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.message.includes("timeout") ||
      error.message.includes("Navigation timeout") ||
      error.name === "TimeoutError"
    );
  }

  private async loadEncounter(encounterId: string): Promise<EncounterCompetition> {
    const encounter = await EncounterCompetition.findByPk(encounterId, {
      attributes: [
        "id",
        "visualCode",
        "shuttle",
        "startHour",
        "endHour",
        "homeTeamId",
        "awayTeamId",
      ],
      include: [
        {
          attributes: [
            "id",
            "visualCode",
            "order",
            "set1Team1",
            "set1Team2",
            "set2Team1",
            "set2Team2",
            "set3Team1",
            "set3Team2",
            "gameType",
            "winner",
          ],
          model: Game,
          include: [
            {
              attributes: ["id", "memberId", "gender", "firstName", "lastName"],
              model: Player,
            },
          ],
        },
        {
          attributes: ["id"],
          model: DrawCompetition,
          include: [
            {
              attributes: ["id"],
              model: SubEventCompetition,
              include: [
                {
                  attributes: ["id", "visualCode"],
                  model: EventCompetition,
                },
              ],
            },
          ],
        },
        {
          model: Player,
          as: "gameLeader",
        },
        {
          model: Assembly,
        },
        {
          model: Team,
          as: "home",
          attributes: ["id", "name", "type"],
        },
        {
          model: Team,
          as: "away",
          attributes: ["id", "name", "type"],
        },
      ],
    });
    if (!encounter) {
      this.logger.error(`Encounter ${encounterId} not found`);
      throw new EnterScoresError(
        EnterScoresErrorCode.ENCOUNTER_NOT_FOUND,
        `Encounter ${encounterId} not found`
      );
    }
    return encounter;
  }

  private async sendNotificationEmail(
    encounter: EncounterCompetition,
    devEmailDestination: string | undefined
  ): Promise<void> {
    if (!devEmailDestination) return;
    try {
      const toernooiUrl = this.constructToernooiUrl(encounter);
      await this.mailingService.sendEnterScoresSuccessMail(
        encounter.id,
        { fullName: "Dev team", email: devEmailDestination, slug: "dev" },
        encounter.visualCode,
        toernooiUrl
      );
      this.logger.log(
        `Success email sent for encounter ${encounter.visualCode || encounter.id}`
      );
    } catch (emailError: unknown) {
      this.logger.error(
        "Failed to send success email:",
        (emailError as Error)?.message ?? emailError
      );
    }
  }

  private async validateRowMessages(): Promise<void> {
    this.logger.log("Validating rows for error messages");
    const errorMessages = await this.formPage.getRowErrorMessages();
    if (errorMessages.length > 0) {
      const errorText = errorMessages.join("; ");
      this.logger.error(`Row validation failed with messages: ${errorText}`);
      throw new EnterScoresError(
        EnterScoresErrorCode.ROW_VALIDATION,
        `Row validation failed: ${errorText}`
      );
    }
    this.logger.log("Row validation passed - no error messages found");
  }

  private async enterGamesWithTransaction(encounter: EncounterCompetition): Promise<void> {
    const transactionId = await this._transactionManager.transaction();
    const transaction = await this._transactionManager.getTransaction(transactionId);
    try {
      await this.formPage.enterGames(encounter, transaction);
      await this._transactionManager.commitTransaction(transactionId);
      this.logger.log("enter games transaction committed successfully");
    } catch (error) {
      this.logger.error(
        "Error during enterGames, rolling back transaction:",
        (error as Error)?.message ?? error
      );
      await this._transactionManager.rollbackTransaction(transactionId);
      throw new EnterScoresError(
        EnterScoresErrorCode.ENTER_GAMES,
        (error as Error)?.message ?? String(error),
        { cause: error }
      );
    }
  }

  private async enterOptionalFields(encounter: EncounterCompetition): Promise<void> {
    if (encounter.gameLeader?.fullName) {
      this.logger.log(`Entering game leader ${encounter.gameLeader.fullName}`);
      await this.formPage.enterGameLeader(encounter.gameLeader.fullName);
    }
    if (encounter.shuttle) {
      this.logger.log(`Entering shuttle ${encounter.shuttle}`);
      await this.formPage.enterShuttle(encounter.shuttle);
    }
    if (encounter.startHour) {
      this.logger.log(`Entering start hour ${encounter.startHour}`);
      await this.formPage.enterStartHour(encounter.startHour);
    }
    if (encounter.endHour) {
      this.logger.log(`Entering end hour ${encounter.endHour}`);
      await this.formPage.enterEndHour(encounter.endHour);
    }
  }

  private async waitForSaveResult(): Promise<void> {
    const saveClicked = await this.formPage.clickSaveButton(5000);
    if (!saveClicked) {
      this.logger.error("Save button not found on page; cannot persist entered scores");
      throw new EnterScoresError(
        EnterScoresErrorCode.SAVE_BUTTON,
        "Save button not found on page; cannot persist entered scores"
      );
    }
    this.logger.debug("Save button found and clicked");
    this.logger.log("Save button clicked, waiting for navigation");

    let saveSucceeded = false;
    let saveFailureReason: "navigation-timeout" | "row-validation" | null = null;
    const saveWaitTimeout = 45000;

    try {
      await Promise.race([
        this.formPage.waitForNavigation({
          waitUntil: "networkidle0",
          timeout: saveWaitTimeout,
        }),
        this.formPage
          .waitForNetworkIdle({ idleTime: 1000, timeout: saveWaitTimeout })
          .catch(() => null),
      ]);
      this.logger.log("Navigation or network idle after save completed");
      saveSucceeded = true;
    } catch (navigationError: unknown) {
      saveFailureReason = "navigation-timeout";
      const navMsg =
        navigationError instanceof Error ? navigationError.message : String(navigationError);
      this.logger.warn(
        `Navigation after save button click failed (e.g. net::ERR_ABORTED at cookiewall); will check page state: ${navMsg}`
      );

      try {
        await this.formPage.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
        this.logger.log("Network idle achieved after navigation timeout");
      } catch (networkError: unknown) {
        this.logger.warn(
          `Network idle also failed: ${(networkError as Error)?.message ?? networkError}`
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const fallbackUrl = this.formPage.getCurrentUrl();
        this.logger.log(`Current URL after fallback wait: ${fallbackUrl}`);
        if (fallbackUrl.includes("teammatch.aspx")) {
          this.logger.warn(
            "Still on teammatch page after save - this might indicate the save didn't work properly"
          );
        }
      }
    }

    const currentUrl = this.formPage.getCurrentUrl();
    const rowErrorMessages = await this.formPage.getRowErrorMessages();
    this.logger.log(
      `Post-save page state: URL=${currentUrl}, rowErrorMessages=${rowErrorMessages.length}, saveSucceeded=${saveSucceeded}`
    );
    if (currentUrl.includes("teammatch.aspx")) {
      this.logger.log(`Post-save URL still on teammatch.aspx (not necessarily an error): ${currentUrl}`);
    }
    if (rowErrorMessages.length > 0) {
      this.logger.warn(`Post-save row error messages: ${rowErrorMessages.join("; ")}`);
      saveSucceeded = false;
      saveFailureReason = "row-validation";
      this.logger.warn("Treating save as failed: row validation messages present after save");
    }

    // Navigation can fail even when save succeeded; use absence of row errors as success signal.
    if (
      !saveSucceeded &&
      saveFailureReason === "navigation-timeout" &&
      rowErrorMessages.length === 0
    ) {
      this.logger.log("Post-save navigation failed but no row errors — treating as success");
      saveSucceeded = true;
    }

    if (saveSucceeded) return;

    let failureMessage = "Save may have failed.";
    if (saveFailureReason === "navigation-timeout") {
      failureMessage +=
        " Reason: navigation timeout after save button click. Scores may not have been persisted on the website.";
    } else if (saveFailureReason === "row-validation") {
      failureMessage += " Reason: row validation error messages present after save.";
    } else {
      failureMessage += " Reason: unknown (no navigation success signal).";
    }
    if (currentUrl.includes("teammatch.aspx")) {
      failureMessage += ` Still on teammatch page (URL: ${currentUrl}).`;
    }
    if (rowErrorMessages.length > 0) {
      failureMessage += ` Row validation messages: ${rowErrorMessages.join("; ")}`;
    }
    throw new EnterScoresError(EnterScoresErrorCode.SAVE_FAILED, failureMessage);
  }

  private async handleFailure(
    error: unknown,
    job: Job<{ encounterId: string }>,
    encounter: EncounterCompetition | null,
    encounterId: string,
    devEmailDestination: string | undefined
  ): Promise<void> {
    const maxAttempts = job.opts?.attempts ?? 1;
    const finalAttempt = isFinalAttempt(job.attemptsMade, maxAttempts);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error instanceof EnterScoresError ? error.code : undefined;

    Sentry.setTag("processor", "enter-scores");
    Sentry.setTag("error_code", errorCode ?? "UNKNOWN");
    Sentry.setContext("job", {
      encounterId,
      encounterVisualCode: encounter?.visualCode ?? undefined,
      jobId: String(job.id),
      attemptsMade: job.attemptsMade + 1,
      maxAttempts,
      phase: this._currentPhase,
      errorCode,
      toernooiUrl: this.constructToernooiUrl(encounter ?? null),
    });

    this.logger.error(
      `EnterScores failed for encounter ${encounter?.visualCode ?? encounterId} [attempt ${job.attemptsMade + 1}/${maxAttempts}]: ${errorMessage}`
    );

    if (errorMessage.includes("Execution context was destroyed")) {
      this.logger.warn(
        "Execution context was destroyed (often transient; job will retry with a fresh browser)"
      );
    }

    if (finalAttempt) {
      if (devEmailDestination) {
        try {
          const toernooiUrl = this.constructToernooiUrl(encounter ?? null);
          await this.mailingService.sendEnterScoresFailedMail(
            encounterId,
            errorMessage,
            { fullName: "Dev team", email: devEmailDestination, slug: "dev" },
            encounter?.visualCode,
            toernooiUrl
          );
          this.logger.log(`Failure email sent for encounter ${encounter?.visualCode ?? encounterId}`);
        } catch (emailError: unknown) {
          this.logger.error(
            "Failed to send failure email:",
            (emailError as Error)?.message ?? emailError
          );
        }
      } else {
        this.logger.log(
          `Skipping failure email - no dev email destination configured for encounter ${encounter?.visualCode ?? encounterId}`
        );
      }
    } else {
      this.logger.warn(
        `Attempt ${job.attemptsMade + 1}/${maxAttempts} failed for encounter ${encounter?.visualCode ?? encounterId}, will retry`
      );
    }
  }

  private async cleanup(
    stopLockRenewal: () => void,
    hangBeforeBrowserCleanup: boolean
  ): Promise<void> {
    stopLockRenewal();
    try {
      if (!hangBeforeBrowserCleanup) {
        this.logger.log("Closing page...");
        await this.formPage.close();
        this.logger.log("Page cleanup completed");
      }
    } catch (error) {
      this.logger.error("Error during page cleanup:", (error as Error)?.message ?? error);
    }
  }

  @Process({
    name: Sync.EnterScores,
    concurrency: 1,
  })
  async enterScores(job: Job<{ encounterId: string }>) {
    this.logger.log(
      `🚀 Starting EnterScores job ${job.id} for encounter ${job.data.encounterId} (PID: ${process.pid})`
    );
    const hangBeforeBrowserCleanup = this.configService.get("HANG_BEFORE_BROWSER_CLEANUP") === true;

    const preflight = enterScoresPreflight({
      visualSyncEnabled: this.configService.get("VISUAL_SYNC_ENABLED") === true,
      enterScoresEnabled: this.configService.get("ENTER_SCORES_ENABLED") === true,
      nodeEnv: this.configService.get("NODE_ENV") ?? "development",
      username: this._username,
      password: this._password,
    });

    if (!preflight.canProceed) {
      this.logger.error(preflight.reason);
      throw new EnterScoresError(EnterScoresErrorCode.PREFLIGHT, preflight.reason);
    }

    this.logger.log("Syncing encounters");
    const encounterId = job.data.encounterId;
    let encounter: EncounterCompetition | null = null;
    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    this.logger.debug(`Dev email destination: ${devEmailDestination}`);

    const stopLockRenewal = startLockRenewal(job);
    try {
      this._currentPhase = "browser_open";
      this.logger.debug("Creating browser");
      await this.formPage.open(preflight.headless, [
        "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView,AutofillEnableAccountWalletStorage",
        "--disable-save-password-bubble",
        "--disable-credentials-enable-service",
        "--disable-credential-saving",
        "--password-store=basic",
        "--no-default-browser-check",
      ]);

      this._currentPhase = "load_encounter";
      this.logger.log("Getting encounter");
      encounter = await this.loadEncounter(encounterId);

      this.logger.log(
        `Entering scores for following encounter: Visual Code: ${encounter.visualCode}, Encounter id: ${encounterId}`
      );

      this._currentPhase = "cookie_accept";
      // acceptCookies can timeout (e.g. net::ERR_ABORTED at cookiewall); we continue and retry later.
      try {
        await this.formPage.acceptCookies(20000);
        this.logger.log("✅ Cookie acceptance completed successfully");
      } catch (error: unknown) {
        if (this.isTimeoutError(error)) {
          this.logger.warn(
            "Cookie acceptance timeout (continuing):",
            (error as Error).message
          );
        } else {
          throw new EnterScoresError(
            EnterScoresErrorCode.COOKIE_ACCEPT,
            (error as Error).message,
            { cause: error }
          );
        }
      }

      this._currentPhase = "sign_in";
      this.logger.log(`Signing in as ${this._username}`);
      try {
        await this.formPage.signIn(this._username, this._password, 20000);
        this.logger.log("✅ Sign in completed successfully");
      } catch (error: unknown) {
        if (!this.isTimeoutError(error)) {
          throw new EnterScoresError(
            EnterScoresErrorCode.SIGN_IN,
            (error as Error).message,
            { cause: error }
          );
        }

        this.logger.warn("Sign in timeout - checking if signed in anyway");
        const signedIn = await this.formPage
          .waitForSignInConfirmation(5000)
          .catch(() => false);
        if (!signedIn) {
          throw new EnterScoresError(
            EnterScoresErrorCode.SIGN_IN,
            `Sign in failed: ${(error as Error).message}`,
            { cause: error }
          );
        }
        this.logger.log("✅ User appears to be signed in despite timeout");
      }

      this._currentPhase = "edit_mode";
      this.logger.log("Entering edit mode");
      await this.formPage.enterEditMode(encounter);

      this._currentPhase = "clear_fields";
      this.logger.log("Clearing fields");
      await this.formPage.clearFields();

      this._currentPhase = "enter_games";
      await this.enterGamesWithTransaction(encounter);
      this._currentPhase = "optional_fields";
      await this.enterOptionalFields(encounter);
      this._currentPhase = "input_validation";
      await this.formPage.enableInputValidation();
      this._currentPhase = "row_validation";
      await this.validateRowMessages();

      this._currentPhase = "save";
      if (preflight.shouldSave) {
        await this.waitForSaveResult();
        await encounter.update({ scoresSyncedAt: new Date() });
      } else {
        this.logger.log("Skipping save button because we are not in production");
      }
      this._currentPhase = "notification";
      await this.sendNotificationEmail(encounter, devEmailDestination);
    } catch (error: unknown) {
      await this.handleFailure(
        error,
        job,
        encounter,
        encounterId,
        devEmailDestination
      );
      throw error;
    } finally {
      await this.cleanup(stopLockRenewal, hangBeforeBrowserCleanup);
    }
  }
}
