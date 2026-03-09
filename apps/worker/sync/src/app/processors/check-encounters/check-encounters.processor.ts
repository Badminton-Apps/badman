import {
  Club,
  CronJob,
  DrawCompetition,
  EncounterCompetition,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { getBrowser, startBrowserHealthMonitoring } from "@badman/backend-pupeteer";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { SearchService } from "@badman/backend-search";
import { ConfigType } from "@badman/utils";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bull";
import { startLockRenewal } from "../../utils";
import { subDays } from "date-fns";
import { isValid } from "date-fns";
import { Op } from "sequelize";
import { determineEncounterAction } from "./guards";
import { EncounterDetailPageService } from "./encounter-detail-page.service";

const includes = [
  {
    model: Team,
    as: "home",
    attributes: ["id", "name"],
    required: true,
    include: [
      {
        model: Club,
        attributes: ["id", "name", "slug"],
      },
    ],
  },
  {
    model: Team,
    as: "away",
    attributes: ["id", "name"],
    required: true,
    include: [
      {
        model: Club,
        attributes: ["id", "name", "slug"],
      },
    ],
  },
  {
    required: true,
    attributes: ["id"],
    model: DrawCompetition,
    include: [
      {
        required: true,
        attributes: ["id", "eventId"],
        model: SubEventCompetition,
      },
    ],
  },
];

@Processor({
  name: SyncQueue,
})
export class CheckEncounterProcessor {
  private readonly logger = new Logger(CheckEncounterProcessor.name);

  private readonly _username?: string;
  private readonly _password?: string;

  constructor(
    private notificationService: NotificationService,
    private searchService: SearchService,
    private configService: ConfigService<ConfigType>,
    private readonly detailPage: EncounterDetailPageService
  ) {
    this._username = configService.get("VR_API_USER");
    this._password = configService.get("VR_API_PASS");

    // Start browser health monitoring
    startBrowserHealthMonitoring();
  }

  @Process({ name: Sync.CheckEncounters, concurrency: 1 })
  async syncEncounters(job: Job) {
    this.logger.log("Syncing encounters");
    const cronJob = await CronJob.findOne({
      where: {
        "meta.jobName": Sync.CheckEncounters,
        "meta.queueName": SyncQueue,
      },
    });

    if (!cronJob) {
      throw new Error("Job not found");
    }

    if (cronJob.running) {
      this.logger.log("Job already running");
      return;
    }

    cronJob.amount++;
    await cronJob.save();

    const stopLockRenewal = startLockRenewal(job);
    try {
      // get all encounters that are not accepted yet within the last 14 days

      const now = new Date();
      const encounters = await EncounterCompetition.findAndCountAll({
        attributes: ["id", "visualCode", "date", "homeTeamId", "awayTeamId"],
        where: {
          date: {
            [Op.between]: [subDays(now, 14), now],
          },
          acceptedOn: null,
          visualCode: {
            [Op.ne]: null,
          },
        },
        include: includes,
      });

      if (encounters.count > 0) {
        this.logger.debug(`Found ${encounters.count} encounters`);

        // Chunk encounters into groups of 10 create a new browser for each group
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < encounters.count; i += chunkSize) {
          chunks.push(encounters.rows.slice(i, i + chunkSize));
        }

        let encountersProcessed = 0;
        let chunksProcessed = 0;
        for (const chunk of chunks) {
          this.logger.debug(
            `Processing chunk of ${chunk.length} encounters, ${
              encounters.count - encountersProcessed
            } encounters left, ${chunks.length - chunksProcessed} chunks left`
          );
          // Close page from previous chunk if any
          if (this.detailPage.isOpen()) {
            try {
              await this.detailPage.close();
            } catch (e) {
              this.logger.debug("Error closing previous page:", e.message);
            }
          }

          await this.detailPage.open();

          // Accept cookies
          await this.detailPage.acceptCookies();

          // Processing encounters
          for (const encounter of chunk) {
            await this.loadEvent(encounter);
            // if event is not found we can't continue
            if (!encounter?.drawCompetition?.subEventCompetition?.eventCompetition) {
              continue;
            }

            await this._syncEncounter(encounter);
            encountersProcessed++;
          }

          chunksProcessed++;
        }
      } else {
        this.logger.debug("No encounters found");
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      stopLockRenewal();
      try {
        await this.detailPage.close();
      } catch (error) {
        this.logger.debug("Error during page cleanup:", error.message || error);
      }

      cronJob.amount--;
      cronJob.lastRun = new Date();
      await cronJob.save();

      this.logger.log("Synced encounters");
    }

    return true;
  }

  @Process({ name: Sync.CheckEncounter, concurrency: 1 })
  async syncEncounter(job: Job<{ encounterId: string }>) {
    const encounter = await EncounterCompetition.findByPk(job.data.encounterId, {
      include: includes,
    });

    if (!encounter) {
      this.logger.error(`Encounter ${job.data.encounterId} not found`);
      return;
    }

    await this.loadEvent(encounter);

    if (!encounter?.drawCompetition?.subEventCompetition?.eventCompetition) {
      // here we throw an error because this is a manual trigger, so we need to know
      this.logger.error(`Event not found for encounter ${encounter.visualCode}`);
      return;
    }

    await this.detailPage.open();
    try {
      // Accept cookies
      await this.detailPage.acceptCookies();

      // Processing encounters
      await this._syncEncounter(encounter);
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      try {
        await this.detailPage.close();
      } catch (error) {
        this.logger.debug("Error during page cleanup:", error.message || error);
      }

      this.logger.log("Synced encounter");
    }
  }

  /// Load the event for the encounter, we do this in a separate part
  /// because the nesting gets to deep and we can't parse the data then
  private async loadEvent(encounter: EncounterCompetition) {
    const event = await encounter.drawCompetition.subEventCompetition.getEventCompetition({
      attributes: ["id", "visualCode", "contactEmail", "name", "checkEncounterForFilledIn"],
      where: {
        checkEncounterForFilledIn: true,
      },
      include: [
        {
          model: Player,
          as: "contact",
          attributes: ["id", "email"],
        },
      ],
    });

    // set the event
    encounter.drawCompetition.subEventCompetition.eventCompetition = event;
  }

  private async _syncEncounter(encounter: EncounterCompetition) {
    const url = await this.detailPage.gotoEncounterPage(encounter);
    this.logger.debug(`Syncing encounter ${url}`);

    try {
      await this.detailPage.consentPrivacyAndCookie();
      const time = await this.detailPage.hasTime();
      if (!time) {
        this.logger.verbose(`Encounter ${encounter.visualCode} has no time`);
        return;
      }
      const { entered, enteredOn } = await this.detailPage.getDetailEntered();
      const { accepted, acceptedOn } = await this.detailPage.getDetailAccepted();
      let hasComment = false;
      try {
        const result = await this.detailPage.getDetailComment();
        hasComment = result.hasComment;
      } catch (error) {
        this.logger.warn(
          `Error checking for comments on encounter ${encounter.visualCode}:`,
          error.message
        );
        // Continue with hasComment = false
      }
      const hoursPassed = encounter.date
        ? Math.floor((Date.now() - encounter.date.getTime()) / (1000 * 60 * 60))
        : 0;

      this.logger.debug(
        `Encounter passed ${hoursPassed} hours ago, entered: ${entered}, accepted: ${accepted}, has comments: ${hasComment} ( ${url} )`
      );
      // Determine what action to take for this encounter
      const checkAction = determineEncounterAction({
        checkEncounterForFilledIn:
          encounter?.drawCompetition?.subEventCompetition?.eventCompetition
            ?.checkEncounterForFilledIn ?? false,
        entered,
        accepted,
        hasComment,
        encounterDate: encounter.date,
        enteredOn,
        awayClubHasSlug: !!encounter.away?.club?.slug,
        autoAcceptEnabled: !!this.configService.get<boolean>("VR_ACCEPT_ENCOUNTERS"),
      });

      switch (checkAction.action) {
        case "notify-has-comment":
          this.notificationService.notifyEncounterHasComment(encounter);
          break;
        case "notify-not-entered":
          this.notificationService.notifyEncounterNotEntered(encounter);
          break;
        case "notify-not-accepted":
          this.notificationService.notifyEncounterNotAccepted(encounter);
          break;
        case "auto-accept": {
          this.logger.debug(
            `Auto accepting encounter ${encounter.visualCode} for club ${encounter.away?.name}`
          );
          await this.detailPage.signIn(this._username, this._password);
          const succesfull = await this.detailPage.acceptEncounter();
          if (!succesfull) {
            this.logger.warn(`Could not auto accept encounter ${encounter.visualCode}`);
            this.notificationService.notifyEncounterNotAccepted(encounter);
          }
          break;
        }
        case "auto-accept-disabled":
          this.logger.debug(
            `Not auto accepting encounters, auto accept is disabled ${encounter.away?.name}`
          );
          break;
        case "auto-accept-too-early":
          this.logger.debug(
            `Not (yet) auto accepting encounter ${encounter.visualCode} for club ${encounter.away?.name}, entered on ${enteredOn} (${checkAction.hoursPassedSinceEntered} hours ago))`
          );
          break;
      }

      // Update our local data
      if (entered) {
        if (!enteredOn || !isValid(enteredOn)) {
          this.logger.error(
            `Entered on date is not valid: ${enteredOn} for encounter ${encounter.visualCode}`
          );
          return;
        }

        encounter.enteredOn = enteredOn;

        try {
          const { endedOn, startedOn, usedShuttle, gameLeader } = await this.detailPage.getDetailInfo();

          this.logger.debug(
            `Encounter started on ${startedOn} and ended on ${endedOn} by ${gameLeader}, used shuttle ${usedShuttle}`
          );

          encounter.startHour = startedOn || undefined;
          encounter.endHour = endedOn || undefined;
          encounter.shuttle = usedShuttle || undefined;

          if (gameLeader && gameLeader.length > 0) {
            const gameLeaderPlayer = await this.searchService.searchPlayers(
              this.searchService.getParts(gameLeader),
              [
                {
                  memberId: {
                    [Op.ne]: null,
                  },
                },
              ]
            );

            if (gameLeaderPlayer && gameLeaderPlayer.length > 0) {
              if (gameLeaderPlayer.length > 1) {
                this.logger.warn(`Found multiple players for game leader ${gameLeader}`);
              } else {
                await encounter.setGameLeader(gameLeaderPlayer[0]);
              }
            }
          }
        } catch (error) {
          this.logger.warn(error);
          // continue, we don't really care about this
        }
      }

      if (entered && accepted) {
        if (!acceptedOn || !isValid(acceptedOn)) {
          this.logger.error(
            `Accepted on date is not valid: ${acceptedOn} for encounter ${encounter.visualCode}`
          );
          return;
        }

        encounter.acceptedOn = acceptedOn;
        encounter.accepted = true;
      }

      await encounter.save();
    } catch (error) {
      this.logger.error(error);

      await this.notificationService.notifySyncEncounterFailed({
        url,
        encounter,
      });
    }
  }
}
