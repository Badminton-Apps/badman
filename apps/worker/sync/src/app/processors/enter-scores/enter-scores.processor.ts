import {
  EncounterCompetition,
  Game,
  Player,
  DrawCompetition,
  SubEventCompetition,
  EventCompetition,
} from "@badman/backend-database";
import { acceptCookies, signIn, waitForSelectors } from "@badman/backend-pupeteer";
import { SyncQueue, Sync, TransactionManager } from "@badman/backend-queue";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bull";
import {
  enterEditMode,
  clearFields,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
  enableInputValidation,
} from "./pupeteer";
import { ConfigType } from "@badman/utils";
import { enterGames } from "./pupeteer/enterGames";
import { getPage } from "@badman/backend-pupeteer";

@Processor({
  name: SyncQueue,
})
export class EnterScoresProcessor {
  private readonly logger = new Logger(EnterScoresProcessor.name);
  private readonly _username?: string;
  private readonly _password?: string;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly _transactionManager: TransactionManager
  ) {
    this._username = configService.get("VR_API_USER");
    this._password = configService.get("VR_API_PASS");

    this.logger.debug("Enter scores processor initialized");
  }

  @Process(Sync.EnterScores)
  async enterScores(job: Job<{ encounterId: string }>) {
    const visualSyncEnabled = this.configService.get("VISUAL_SYNC_ENABLED") === true;
    const enterScoresEnabled = this.configService.get("ENTER_SCORES_ENABLED") === true;
    const headlessValue = visualSyncEnabled ? false : true;
    if (!this._username || !this._password) {
      this.logger.error("No username or password found");
      return;
    }

    this.logger.log("Syncing encounters");
    const encounterId = job.data.encounterId;

    this.logger.debug("Creating browser");
    const page = await getPage(headlessValue, [
      "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView,AutofillEnableAccountWalletStorage",
      "--disable-save-password-bubble",
      "--disable-credentials-enable-service",
      "--disable-credential-saving",
      "--password-store=basic",
      "--no-default-browser-check",
    ]);

    try {
      if (!page) {
        this.logger.error("No page found");
        return;
      }

      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      this.logger.log("Getting encounter");
      const encounter = await EncounterCompetition.findByPk(encounterId, {
        attributes: ["id", "visualCode", "shuttle", "startHour", "endHour"],
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
        ],
      });

      if (!encounter) {
        this.logger.error(`Encounter ${encounterId} not found`);
        return;
      }

      this.logger.log(`Entering scores for ${encounter.visualCode}`);

      await acceptCookies({ page }, { logger: this.logger });
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
          { games: encounter.games, logger: this.logger, transaction: transaction }
        );
        await this._transactionManager.commitTransaction(transactionId);
        this.logger.log("enter games transaction committed successfully");
      } catch (error) {
        this.logger.error("Error during enterGames, rolling back transaction:", error);
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

      const nodeEv = process.env.NODE_ENV;

      const saveButton = await waitForSelectors([["input#btnSave.button"]], page, 5000);
      if (saveButton) {
        this.logger.debug(`Save button found`);
        if (nodeEv === "production" || enterScoresEnabled) {
          await saveButton.click();
          this.logger.log(`Save button clicked, waiting for navigation`);
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          this.logger.log(`Navigation completed`);
        } else {
          this.logger.log(`Skipping save button because we are not in production`);
        }
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      if (!visualSyncEnabled) {
        this.logger.log(`Closing browser page...`);
        await page.close();
        this.logger.log("Browser closed");
      }
    }
  }
}
