import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { NotificationService } from '@badman/backend-notifications';
import { accepCookies, getBrowser } from '@badman/backend-pupeteer';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import { Browser, Page } from 'puppeteer';
import { Op } from 'sequelize';
import {
  detailAccepted,
  detailEntered,
  gotoEncounterPage,
  hasTime,
} from './pupeteer';

@Processor({
  name: SyncQueue,
})
export class CheckEncounterProcessor {
  private readonly logger = new Logger(CheckEncounterProcessor.name);

  constructor(private notificationService: NotificationService) {
    this.logger.debug('Check encounter processor initialized');
  }

  @Process(Sync.CheckEncounters)
  async syncEncounters(): Promise<void> {
    this.logger.log('Syncing encounters');
    let browser: Browser | undefined;
    try {
      const encounters = await EncounterCompetition.findAndCountAll({
        attributes: ['id', 'visualCode', 'date', 'homeTeamId', 'awayTeamId'],
        where: {
          date: {
            [Op.lte]: new Date(),
          },
          acceptedOn: null,
          visualCode: {
            [Op.ne]: null,
          },
        },
        include: [
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
        ],
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
            } encounter left, ${chunks.length - chunksProcessed} chunks left`
          );
          // Close browser if any
          if (browser) {
            browser.close();
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
            await this.syncEncounter(encounter, page);
            encountersProcessed++;
          }
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
        browser.close();
      }

      this.logger.log('Synced encounters');
    }
  }

  private async syncEncounter(encounter: EncounterCompetition, page: Page) {
    this.logger.debug(`Syncing encounter ${encounter.visualCode}`);
    const url = await gotoEncounterPage({ page }, encounter);

    const time = await hasTime({ page }, { logger: this.logger });
    if (!time) {
      this.logger.verbose(`Encounter ${encounter.visualCode} has no time`);
      return;
    }
    const { entered, enteredOn } = await detailEntered(
      { page },
      { logger: this.logger }
    );
    const { accepted, acceptedOn } = await detailAccepted(
      { page },
      { logger: this.logger }
    );

    const hoursPassed = moment().diff(encounter.date, 'hour');
    this.logger.debug(
      `Encounter passed ${hoursPassed} hours ago, entered: ${entered}, accepted: ${accepted}, ( ${url} )`
    );

    if (!entered && hoursPassed > 24) {
      this.notificationService.notifyEncounterNotEntered(encounter);
    } else if (!accepted && hoursPassed > 48) {
      this.notificationService.notifyEncounterNotAccepted(encounter);
    }

    // Update our local data
    if (entered) {
      encounter.enteredOn = moment(enteredOn ?? '2000-08-27').toDate();
      await encounter.save();
    }

    if (accepted) {
      encounter.acceptedOn = moment(acceptedOn ?? '2000-08-27').toDate();
      encounter.accepted = true;
      await encounter.save();
    }
  }
}
