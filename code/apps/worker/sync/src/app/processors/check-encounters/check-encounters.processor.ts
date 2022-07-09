import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  SubEventCompetition,
} from '@badman/api/database';
import { accepCookies, signIn } from '@badman/pupeteer';
import { SyncQueue, Sync } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import { Browser, launch } from 'puppeteer';
import { Op } from 'sequelize';
import { detailAccepted, detailEntered, gotoEncounterPage } from './pupeteer';

@Processor({
  name: SyncQueue,
})
export class CheckEncounterProcessor {
  private readonly logger = new Logger(CheckEncounterProcessor.name);

  constructor() {
    this.logger.debug('Check encounter processor initialized');
  }

  @Process(Sync.CheckEncounters)
  async syncEncounters(): Promise<void> {
    this.logger.log('Syncing encounters');
    let browser: Browser;

    try {
      const encounters = await EncounterCompetition.findAndCountAll({
        attributes: ['id', 'visualCode', 'date'],
        where: {
          date: {
            [Op.lte]: new Date(),
          },
          acceptedById: null,
          visualCode: {
            [Op.ne]: null,
          },
        },
        include: [
          {
            attributes: ['id'],
            model: DrawCompetition,
            include: [
              {
                attributes: ['id'],
                model: SubEventCompetition,
                include: [
                  {
                    attributes: ['id', 'visualCode'],
                    model: EventCompetition,
                  },
                ],
              },
            ],
          },
        ],
      });

      if (encounters.count > 0) {
        // Create browser
        browser = await launch({
          // headless: false,
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        await page.setViewport({ width: 1691, height: 1337 });

        // Accept cookies
        await accepCookies({ page });

        // Processing encounters
        this.logger.debug(`Found ${encounters.count} encounters`);
        for (const encounter of encounters.rows) {
          this.logger.debug(`Syncing encounter ${encounter.visualCode}`);
          const url = await gotoEncounterPage({ page }, encounter);

          const entered = await detailEntered({ page });
          const accepted = await detailAccepted({ page });

          // If not entered, and more then 40hours since start send mail
          if (!entered && moment().diff(encounter.date, 'hour') > 40) {
            this.logger.debug(
              `Sending reminder for entering ${encounter.id} (${url})`
            );
            continue;
          }

          // if not accepted, and more then 70hours since start send mail
          if (
            entered &&
            !accepted &&
            moment().diff(encounter.date, 'hour') > 70
          ) {
            this.logger.debug(
              `Sending reminder for accepting encounter ${encounter.id} (${url})`
            );
            continue;
          }
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
    }
  }
}
