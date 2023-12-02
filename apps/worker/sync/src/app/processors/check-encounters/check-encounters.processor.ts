import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { NotificationService } from '@badman/backend-notifications';
import { accepCookies, getBrowser } from '@badman/backend-pupeteer';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { SearchService } from '@badman/backend-search';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import moment from 'moment';
import { Browser, Page } from 'puppeteer';
import { Op } from 'sequelize';
import {
  detailAccepted,
  detailComment,
  detailEntered,
  detailInfo,
  gotoEncounterPage,
  hasTime,
} from './pupeteer';

const includes = [
  {
    model: Team,
    as: 'home',
    attributes: ['id', 'name'],
  },
  {
    model: Team,
    as: 'away',
    attributes: ['id', 'name'],
  },
  {
    required: true,
    attributes: ['id'],
    model: DrawCompetition,
    include: [
      {
        required: true,
        attributes: ['id'],
        model: SubEventCompetition,
        include: [
          {
            required: true,
            attributes: ['id', 'visualCode'],
            model: EventCompetition,
            where: {
              checkEncounterForFilledIn: true,
            },
          },
        ],
      },
    ],
  },
];

@Processor({
  name: SyncQueue,
})
export class CheckEncounterProcessor {
  private readonly logger = new Logger(CheckEncounterProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private searchService: SearchService,
  ) {}

  @Process(Sync.CheckEncounters)
  async syncEncounters() {
    this.logger.log('Syncing encounters');
    let browser: Browser | undefined;
    try {
      // get all encounters that are not accepted yet within the last 14 days

      const encounters = await EncounterCompetition.findAndCountAll({
        attributes: ['id', 'visualCode', 'date', 'homeTeamId', 'awayTeamId'],
        where: {
          date: {
            [Op.between]: [
              moment().subtract(14, 'days').toDate(),
              moment().toDate(),
            ],
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
            `Processing cthunk of ${chunk.length} encounters, ${
              encounters.count - encountersProcessed
            } encounter left, ${chunks.length - chunksProcessed} chunks left`,
          );
          // Close browser if any
          if (browser) {
            await browser.close();
          }

          // Create browser
          browser = await getBrowser();

          const page = await browser.newPage();
          page.setDefaultTimeout(10000);
          await page.setViewport({ width: 1691, height: 1337 });

          // Accept cookies
          await accepCookies({ page });

          // Processing encounters
          for (const encounter of chunk) {
            await this._syncEncounter(encounter, page);
            encountersProcessed++;
          }

          await page.close();
          chunksProcessed++;
        }
      } else {
        this.logger.debug('No encounters found');
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      // Close browser
      if (browser) {
        await browser.close();
      }

      this.logger.log('Synced encounters');
    }

    return true;
  }

  @Process(Sync.CheckEncounter)
  async syncEncounter(job: Job<{ encounterId: string }>) {
    const encounter = await EncounterCompetition.findByPk(
      job.data.encounterId,
      {
        include: includes,
      },
    );

    if (!encounter) {
      this.logger.error(`Encounter ${job.data.encounterId} not found`);
      return;
    }
    // Create browser
    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await accepCookies({ page });

      // Processing encounters
      await this._syncEncounter(encounter, page);

      await page.close();
    } catch (error) {
      this.logger.error(error);
    } finally {
      // Close browser
      if (browser) {
        browser.close();
      }

      this.logger.log('Synced encounters');
    }
  }

  private async _syncEncounter(encounter: EncounterCompetition, page: Page) {
    const url = await gotoEncounterPage({ page }, encounter);
    this.logger.debug(`Syncing encounter ${url}`);
    try {
      const time = await hasTime({ page }, { logger: this.logger });
      if (!time) {
        this.logger.verbose(`Encounter ${encounter.visualCode} has no time`);
        return;
      }
      const { entered, enteredOn } = await detailEntered(
        { page },
        { logger: this.logger },
      );
      const { accepted, acceptedOn } = await detailAccepted(
        { page },
        { logger: this.logger },
      );
      const { hasComment } = await detailComment(
        { page },
        { logger: this.logger },
      );

      const hoursPassed = moment().diff(encounter.date, 'hour');
      this.logger.debug(
        `Encounter passed ${hoursPassed} hours ago, entered: ${entered}, accepted: ${accepted}, has comments: ${hasComment} ( ${url} )`,
      );

      if (!entered && hoursPassed > 24 && !hasComment) {
        this.notificationService.notifyEncounterNotEntered(encounter);
      } else if (!accepted && hoursPassed > 48 && !hasComment) {
        this.notificationService.notifyEncounterNotAccepted(encounter);
      }

      // Update our local data
      if (entered) {
        const enteredMoment = moment(enteredOn);

        if (!enteredMoment.isValid()) {
          this.logger.error(
            `Entered on date is not valid: ${enteredOn} for encounter ${encounter.visualCode}`,
          );
          return;
        }

        encounter.enteredOn = enteredMoment.toDate();

        try {
          const { endedOn, startedOn, usedShuttle, gameLeader } =
            await detailInfo({ page }, { logger: this.logger });

          this.logger.debug(
            `Encounter started on ${startedOn} and ended on ${endedOn} by ${gameLeader}, used shuttle ${usedShuttle}`,
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
              ],
            );

            if (gameLeaderPlayer && gameLeaderPlayer.length > 0) {
              if (gameLeaderPlayer.length > 1) {
                this.logger.warn(
                  `Found multiple players for game leader ${gameLeader}`,
                );
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
        const acceptedMoment = moment(acceptedOn);

        if (!acceptedMoment.isValid()) {
          this.logger.error(
            `Accepted on date is not valid: ${acceptedOn} for encounter ${encounter.visualCode}`,
          );
          return;
        }

        encounter.acceptedOn = acceptedMoment.toDate();
        encounter.accepted = true;
      }

      await encounter.save();
    } catch (error) {
      this.logger.error(error);
      const glenn = await Player.findOne({
        where: {
          slug: 'glenn-latomme',
        },
      });

      if (!glenn) {
        this.logger.error(`Glenn not found`);
        return;
      }

      await this.notificationService.notifySyncEncounterFailed(glenn.id, {
        url,
        encounter,
      });
    }
  }
}
