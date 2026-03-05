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
import { getPage, acceptCookies, signIn, waitForSelectors } from "@badman/backend-pupeteer";
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

  /**
   * Collects text from all div.submatchrow_message elements on the page (row validation messages).
   */
  private async getRowErrorMessages(page: any): Promise<string[]> {
    return page.evaluate(() => {
      const messageElements = document.querySelectorAll("div.submatchrow_message");
      const messages: string[] = [];
      messageElements.forEach((element: Element) => {
        const text = element.textContent?.trim();
        if (text) messages.push(text);
      });
      return messages;
    });
  }

  /**
   * Returns current page URL and any row validation error messages (e.g. after save).
   * Used to re-check page state after save and decide success vs failure.
   */
  private async getPostSavePageState(page: any): Promise<{
    currentUrl: string;
    rowErrorMessages: string[];
  }> {
    const currentUrl = page.url();
    const rowErrorMessages = await this.getRowErrorMessages(page);
    return { currentUrl, rowErrorMessages };
  }

  private async validateRowMessages(page: any): Promise<void> {
    this.logger.log("Validating rows for error messages");

    try {
      const errorMessages = await this.getRowErrorMessages(page);

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
  })
  async enterScores(job: Job<{ encounterId: string }>) {
    this.logger.log(
      `🚀 Starting EnterScores job ${job.id} for encounter ${job.data.encounterId} (PID: ${process.pid})`
    );
    const visualSyncEnabled = this.configService.get("VISUAL_SYNC_ENABLED") === true;
    const enterScoresEnabled = this.configService.get("ENTER_SCORES_ENABLED") === true;
    const hangBeforeBrowserCleanup = this.configService.get("HANG_BEFORE_BROWSER_CLEANUP") === true;
    const nodeEnv = this.configService.get("NODE_ENV");

    const headlessValue = visualSyncEnabled ? false : true;
    if (!this._username || !this._password) {
      this.logger.error("No username or password found");
      throw new Error("No username or password configured for Visual sync");
    }

    this.logger.log("Syncing encounters");
    const encounterId = job.data.encounterId;
    let encounter: EncounterCompetition | null = null; // Declare encounter outside try block
    let page: Awaited<ReturnType<typeof getPage>> | null = null; // Declare page outside try block
    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    this.logger.debug(`Dev email destination: ${devEmailDestination}`);

    try {
      this.logger.debug("Creating browser");
      page = await getPage(headlessValue, [
        "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView,AutofillEnableAccountWalletStorage",
        "--disable-save-password-bubble",
        "--disable-credentials-enable-service",
        "--disable-credential-saving",
        "--password-store=basic",
        "--no-default-browser-check",
      ]);

      if (!page) {
        this.logger.error("No page found");
        throw new Error("Failed to create browser page");
      }

      // Increase default timeout to 30 seconds to handle slow network conditions
      page.setDefaultTimeout(30000);
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
        throw new Error(`Encounter ${encounterId} not found`);
      }

      this.logger.log(
        `Entering scores for following encounter: Visual Code: ${encounter.visualCode}, Encounter id: ${encounterId}`
      );

      // 🔧 FIX: Wrap acceptCookies in specific error handling
      try {
        await acceptCookies({ page, timeout: 20000 }, { logger: this.logger });
        this.logger.log("✅ Cookie acceptance completed successfully");
      } catch (error: any) {
        const isTimeoutError =
          error?.message?.includes("timeout") ||
          error?.message?.includes("Navigation timeout") ||
          error?.name === "TimeoutError";

        if (isTimeoutError) {
          this.logger.warn(
            "❌ Cookie acceptance timeout (continuing anyway):",
            error?.message || error
          );
          // Don't throw timeout errors - continue with the process
        } else {
          this.logger.error("❌ Cookie acceptance failed:", error?.message || error);

          // Check if this is a critical error that should stop the job
          if (error?.name === "CookieAcceptanceError") {
            throw new Error(
              `Failed to accept cookies: ${error?.message}. This may indicate the website is down or has changed.`
            );
          }

          // For other non-timeout errors, re-throw to maintain existing behavior
          throw error;
        }
      }
      this.logger.log(`Signing in as ${this._username}`);
      try {
        await signIn(
          { page, timeout: 20000 },
          { username: this._username, password: this._password, logger: this.logger }
        );
        this.logger.log("✅ Sign in completed successfully");
      } catch (error: any) {
        const isTimeoutError =
          error?.message?.includes("timeout") ||
          error?.message?.includes("Navigation timeout") ||
          error?.name === "TimeoutError";

        if (isTimeoutError) {
          this.logger.warn("❌ Sign in timeout - attempting to continue:", error?.message || error);
          // Check if we're actually signed in despite the timeout
          try {
            const profileMenu = await page.waitForSelector("#profileMenu", { timeout: 5000 });
            if (profileMenu) {
              this.logger.log("✅ User appears to be signed in despite timeout");
            } else {
              throw new Error("Sign in timeout and user not signed in");
            }
          } catch (checkError) {
            throw new Error(`Sign in failed: ${error?.message || error}`);
          }
        } else {
          throw error; // Re-throw non-timeout errors
        }
      }

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

      const saveButton = await waitForSelectors([["input#btnSave.button"]], page, 5000);
      if (saveButton) {
        this.logger.debug(`Save button found`);
        if (nodeEnv === "production" || enterScoresEnabled) {
          await saveButton.click();
          this.logger.log(`Save button clicked, waiting for navigation`);

          let saveSucceeded = false;
          let saveFailureReason: "navigation-timeout" | "row-validation" | null = null;
          const saveWaitTimeout = 45000; // 45 seconds for save navigation (page navigates on success, not AJAX)

          try {
            await page.waitForNavigation({
              waitUntil: "networkidle0",
              timeout: saveWaitTimeout,
            });
            this.logger.log(`Navigation completed successfully`);
            saveSucceeded = true;
          } catch (navigationError: any) {
            saveFailureReason = "navigation-timeout";
            this.logger.warn(
              `Navigation timeout after save button click: ${navigationError?.message || navigationError}`
            );

            try {
              await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
              this.logger.log(`Network idle achieved after navigation timeout`);
            } catch (networkError: any) {
              this.logger.warn(
                `Network idle also failed: ${networkError?.message || networkError}`
              );

              await new Promise((resolve) => setTimeout(resolve, 3000));
              const currentUrl = page.url();
              this.logger.log(`Current URL after fallback wait: ${currentUrl}`);

              if (currentUrl.includes("teammatch.aspx")) {
                this.logger.warn(
                  `Still on teammatch page after save - this might indicate the save didn't work properly`
                );
              }
            }
          }

          // Re-check page state after save:
          // - staying on teammatch.aspx is NOT necessarily an error (per user observation)
          // - row validation messages ARE errors
          const { currentUrl, rowErrorMessages } = await this.getPostSavePageState(page);
          this.logger.log(
            `Post-save page state: URL=${currentUrl}, rowErrorMessages=${rowErrorMessages.length}, saveSucceeded=${saveSucceeded}`
          );
          if (currentUrl.includes("teammatch.aspx")) {
            this.logger.log(
              `Post-save URL still on teammatch.aspx (not necessarily an error): ${currentUrl}`
            );
          }
          if (rowErrorMessages.length > 0) {
            this.logger.warn(`Post-save row error messages: ${rowErrorMessages.join("; ")}`);
            saveSucceeded = false;
            saveFailureReason = "row-validation";
            this.logger.warn("Treating save as failed: row validation messages present after save");
          }

          // Send success email only when navigation completed and page state OK; otherwise send error email
          if (saveSucceeded) {
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
                this.logger.error(
                  "Failed to send success email:",
                  emailError?.message || emailError
                );
              }
            } else {
              this.logger.log(
                `Skipping success email notification - no dev email destination configured for encounter ${encounter.visualCode || encounter.id}`
              );
            }
          } else {
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
            this.logger.warn(failureMessage);
            if (devEmailDestination) {
              try {
                const toernooiUrl = this.constructToernooiUrl(encounter);
                await this.mailingService.sendEnterScoresFailedMail(
                  encounterId,
                  failureMessage,
                  {
                    fullName: "Dev team",
                    email: devEmailDestination,
                    slug: "dev",
                  },
                  encounter?.visualCode,
                  toernooiUrl
                );
                this.logger.log(
                  `Failure email sent for encounter ${encounter?.visualCode || encounterId} (${saveFailureReason || "unknown"})`
                );
              } catch (emailError) {
                this.logger.error(
                  "Failed to send failure email:",
                  emailError?.message || emailError
                );
              }
            } else {
              this.logger.log(
                `Skipping failure email notification - no dev email destination configured for encounter ${encounter?.visualCode || encounterId}`
              );
            }
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
      } else {
        // If we can't find the save button, we can't persist anything. Fail hard so the job is retried
        // and the generic catch/failure-email path kicks in.
        this.logger.error("Save button not found on page; cannot persist entered scores");
        throw new Error("Save button not found on page; cannot persist entered scores");
      }
    } catch (error) {
      // Handle timeout errors specifically to prevent worker restarts
      const isTimeoutError =
        error?.message?.includes("timeout") ||
        error?.message?.includes("Navigation timeout") ||
        error?.name === "TimeoutError";

      // Send failure email notification first
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

      // Now handle the error appropriately for Bull queue
      if (isTimeoutError) {
        this.logger.warn("Timeout error occurred - job will be retried:", error?.message || error);
        // Re-throw timeout errors so Bull can retry the job
        throw error;
      } else {
        this.logger.error(
          "Error during enter scores process - job will be retried:",
          error?.message || error
        );
        // Re-throw all errors so Bull can retry the job
        throw error;
      }
    } finally {
      try {
        if (!hangBeforeBrowserCleanup && page) {
          this.logger.log(`Closing page...`);
          await page.close();
          this.logger.log("Page cleanup completed");
        }
      } catch (error) {
        this.logger.error("Error during page cleanup:", error?.message || error);
      }
    }
  }
}
