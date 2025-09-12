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
import {
  getPageWithCleanup,
  acceptCookies,
  signIn,
  waitForSelectors,
} from "@badman/backend-pupeteer";
import {
  enableInputValidation,
  enterEditMode,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
} from "./pupeteer";
import { clearFields } from "./pupeteer";
import { enterGames } from "./pupeteer/enterGames";

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
    private readonly mailingService: MailingService
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

  private async validateRowMessages(page: any): Promise<void> {
    this.logger.log("Validating rows for error messages");

    try {
      // Look for all divs with class submatchrow_message
      const errorMessages = await page.evaluate(() => {
        const messageElements = document.querySelectorAll("div.submatchrow_message");
        const messages: string[] = [];

        messageElements.forEach((element: Element) => {
          const text = element.textContent?.trim();
          if (text) {
            messages.push(text);
          }
        });

        return messages;
      });

      if (errorMessages.length > 0) {
        const errorText = errorMessages.join("; ");
        this.logger.error(`Row validation failed with messages: ${errorText}`);
        throw new Error(`Row validation failed: ${errorText}`);
      }

      this.logger.log("Row validation passed - no error messages found");
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof Error && error.message.includes("Row validation failed")) {
        throw error;
      }

      // Log and re-throw other errors that might occur during page evaluation
      this.logger.error("Error during row validation:", error?.message || error);
      throw new Error(`Row validation error: ${error?.message || String(error)}`);
    }
  }

  @Process({
    name: Sync.EnterScores,
    concurrency: 1, // Only 1 concurrent job
  })
  async enterScores(job: Job<{ encounterId: string }>) {
    this.logger.log(
      `🚀 Starting EnterScores job ${job.id} for encounter ${job.data.encounterId} (PID: ${process.pid})`
    );
    const visualSyncEnabled = this.configService.get("VISUAL_SYNC_ENABLED") === true;
    const enterScoresEnabled = this.configService.get("ENTER_SCORES_ENABLED") === true;
    const hangBeforeBrowserCleanup = this.configService.get("HANG_BEFORE_BROWSER_CLEANUP") === true;
    const headlessValue = visualSyncEnabled ? false : true;
    if (!this._username || !this._password) {
      this.logger.error("No username or password found");
      return;
    }

    this.logger.log("Syncing encounters");
    const encounterId = job.data.encounterId;
    let encounter: EncounterCompetition | null = null; // Declare encounter outside try block
    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    this.logger.debug(`Dev email destination: ${devEmailDestination}`);

    this.logger.debug("Creating browser");
    const pageInstance = await getPageWithCleanup(headlessValue, [
      "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView,AutofillEnableAccountWalletStorage",
      "--disable-save-password-bubble",
      "--disable-credentials-enable-service",
      "--disable-credential-saving",
      "--password-store=basic",
      "--no-default-browser-check",
    ]);
    const { page } = pageInstance;

    try {
      if (!page) {
        this.logger.error("No page found");
        return;
      }

      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      this.logger.log("Getting encounter");
      encounter = await EncounterCompetition.findByPk(encounterId, {
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
                attributes: ["id", "memberId"],
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
        return;
      }

      this.logger.log(
        `Entering scores for following encounter: Visual Code: ${encounter.visualCode}, Encounter id: ${encounterId}`
      );

      // 🔧 FIX: Wrap acceptCookies in specific error handling
      try {
        await acceptCookies({ page, timeout: 15000 }, { logger: this.logger });
        this.logger.log("✅ Cookie acceptance completed successfully");
      } catch (error: any) {
        this.logger.error("❌ Cookie acceptance failed:", error?.message || error);

        // Check if this is a critical error that should stop the job
        if (error?.name === "CookieAcceptanceError") {
          throw new Error(
            `Failed to accept cookies: ${error?.message}. This may indicate the website is down or has changed.`
          );
        }

        // For other errors, re-throw to maintain existing behavior
        throw error;
      }
      this.logger.log(`Signing in as ${this._username}`);
      await signIn(
        { page },
        { username: this._username, password: this._password, logger: this.logger }
      );

      this.logger.log(`Entering edit mode`);
      await enterEditMode({ page }, encounter);

      this.logger.log(`Clearing fields`);
      await clearFields({ page }, { logger: this.logger });

      // Create a transaction for database operations
      const transactionId = await this._transactionManager.transaction();
      const transaction = await this._transactionManager.getTransaction(transactionId);

      try {
        await enterGames(
          { page },
          { encounter: encounter, logger: this.logger, transaction: transaction }
        );
        await this._transactionManager.commitTransaction(transactionId);
        this.logger.log("enter games transaction committed successfully");
      } catch (error) {
        this.logger.error(
          "Error during enterGames, rolling back transaction:",
          error?.message || error
        );
        await this._transactionManager.rollbackTransaction(transactionId);
        throw error;
      }

      if (encounter.gameLeader?.fullName) {
        this.logger.log(`Entering game leader ${encounter.gameLeader?.fullName}`);
        await enterGameLeader({ page }, encounter.gameLeader?.fullName);
      }

      if (encounter.shuttle) {
        this.logger.log(`Entering shuttle ${encounter.shuttle}`);
        await enterShuttle({ page }, encounter.shuttle);
      }

      if (encounter.startHour) {
        this.logger.log(`Entering start hour ${encounter.startHour}`);
        await enterStartHour({ page }, encounter.startHour);
      }

      if (encounter.endHour) {
        this.logger.log(`Entering end hour ${encounter.endHour}`);
        await enterEndHour({ page }, encounter.endHour);
      }

      await enableInputValidation({ page }, this.logger);

      // Validate rows for error messages
      await this.validateRowMessages(page);

      const nodeEv = process.env.NODE_ENV;

      const saveButton = await waitForSelectors([["input#btnSave.button"]], page, 5000);
      if (saveButton) {
        this.logger.debug(`Save button found`);
        if (nodeEv === "production" || enterScoresEnabled) {
          await saveButton.click();
          this.logger.log(`Save button clicked, waiting for navigation`);
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          this.logger.log(`Navigation completed`);

          // Send success email notification
          if (devEmailDestination) {
            try {
              const toernooiUrl = this.constructToernooiUrl(encounter);
              await this.mailingService.sendEnterScoresSuccessMail(
                encounter.id,
                {
                  fullName: "Dev team",
                  email: devEmailDestination,
                  slug: "dev",
                },
                encounter.visualCode,
                toernooiUrl
              );
              this.logger.log(
                `Success email sent for encounter ${encounter.visualCode || encounter.id}`
              );
            } catch (emailError) {
              this.logger.error("Failed to send success email:", emailError?.message || emailError);
            }
          } else {
            this.logger.log(
              `Skipping success email notification - no dev email destination configured for encounter ${encounter.visualCode || encounter.id}`
            );
          }
        } else {
          this.logger.log(`Skipping save button because we are not in production`);
          if (devEmailDestination) {
            try {
              const toernooiUrl = this.constructToernooiUrl(encounter);
              await this.mailingService.sendEnterScoresSuccessMail(
                encounter.id,
                {
                  fullName: "Dev team",
                  email: devEmailDestination,
                  slug: "dev",
                },
                encounter.visualCode,
                toernooiUrl
              );
              this.logger.log(
                `Success email sent for encounter ${encounter.visualCode || encounter.id}`
              );
            } catch (emailError) {
              this.logger.error("Failed to send success email:", emailError?.message || emailError);
            }
          } else {
            this.logger.log(
              `Skipping success email notification - no dev email destination configured for encounter ${encounter.visualCode || encounter.id}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error("Error during enter scores process:", error?.message || error);

      // Send failure email notification
      if (devEmailDestination) {
        try {
          // Get encounter info for the email, fallback to encounterId if encounter is not available
          const encounterInfo = encounter?.visualCode || encounterId;
          const toernooiUrl = this.constructToernooiUrl(encounter);
          await this.mailingService.sendEnterScoresFailedMail(
            encounterId,
            error?.message || String(error),
            {
              fullName: "Dev team",
              email: devEmailDestination,
              slug: "dev",
            },
            encounter?.visualCode,
            toernooiUrl
          );
          this.logger.log(`Failure email sent for encounter ${encounterInfo}`);
        } catch (emailError) {
          this.logger.error("Failed to send failure email:", emailError?.message || emailError);
        }
      } else {
        const encounterInfo = encounter?.visualCode || encounterId;
        this.logger.log(
          `Skipping failure email notification - no dev email destination configured for encounter ${encounterInfo}`
        );
      }
    } finally {
      try {
        if (!hangBeforeBrowserCleanup) {
          this.logger.log(`Cleaning up browser instance...`);
          await pageInstance.cleanup();
          this.logger.log("Browser cleanup completed");
        }
      } catch (error) {
        this.logger.error("Error during browser cleanup:", error?.message || error);
      }
    }
  }
}
