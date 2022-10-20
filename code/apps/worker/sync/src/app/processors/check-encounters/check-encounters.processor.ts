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
import { Browser } from 'puppeteer';
import { Op } from 'sequelize';
import {
  detailAccepted,
  detailEntered,
  gotoEncounterPage,
  hasTime,
} from './pupeteer';

const TEST_TEAMS = [
  // Smash For Fun
  '25ac5f2b-af0d-4cac-8410-4a066c991596',
  '20da7b3c-ceb6-495f-bae6-8fc486c85955',
  'b56b5220-975d-4f12-9553-7caba4ea3d6d',
  'fd40028b-8e23-4b57-b724-156d380b49e8',
  'b73c5777-b591-4a97-bd84-b783a700b30a',
  'd8a2293c-e5d0-4a71-83e2-3d0c5e1a9fb7',
  '7367a857-b3fc-4fc0-8fbb-02d1c57806e0',
  'e1033a44-a543-45a5-b123-9d7901ef8f07',
  '316c819c-afd8-4336-b648-2da9cc99a01d',

  // BD Opslag
  'b2673d7e-807c-44b8-a6bc-5c726a995158', // 1G
  'f9906ec5-591a-45c7-8ab5-d0ffd49095db', // 4G
  '436d26f3-1afa-4b48-9994-0e0967872f54', // 1H

  // Herne
  '028b6262-9f05-41e0-92af-3915f766c29d',
  'c4736c19-5543-427f-a287-fb9df013b269',
  '794f86de-165c-4b72-8b35-beb7f7cd60c0',
  '3a988bdd-8af1-4a04-858e-2b72f8ae16e7',
  '2e288173-43b5-4b20-b0b9-bdcae4ee4a31',
  '283ec422-375e-4fb3-9583-0841a8fb6b47',
  '988c072a-35dc-458a-a4b1-4b58be968540',
  '5df3e122-f027-4bcb-a671-79a8d5f32120',
  '11880680-183b-4fb3-9367-17f70a12b809',
];

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
    let browser: Browser;

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
          [Op.or]: [
            {
              homeTeamId: TEST_TEAMS,
            },
            {
              awayTeamId: TEST_TEAMS,
            },
          ],
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
        // Create browser
        browser = await getBrowser();

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

          const time = await hasTime({ page }, { logger: this.logger });
          if (!time) {
            this.logger.verbose(
              `Encounter ${encounter.visualCode} has no time`
            );
            continue;
          }
          const entered = await detailEntered(
            { page },
            { logger: this.logger }
          );
          const accepted = await detailAccepted(
            { page },
            { logger: this.logger }
          );

          const hoursPassed = moment().diff(encounter.date, 'hour');
          this.logger.debug(
            `Encounter passed ${hoursPassed} hours ago, entered: ${entered}, accepted: ${accepted}`
          );

          if (entered && hoursPassed > 24) {
            this.logger.verbose(
              `Sending reminder for entering ${encounter.id} (${url})`
            );

            this.notificationService.notifyEncounterNotEntered(encounter);
          } else if (!accepted && hoursPassed > 48) {
            this.logger.verbose(
              `Sending reminder for accepting encounter ${encounter.id} (${url})`
            );
            this.notificationService.notifyEncounterNotAccepted(encounter);
          }

          // Update our local data
          if (entered) {
            encounter.enteredOn = moment('2000-08-27').toDate();
            await encounter.save();
          }

          if (accepted) {
            encounter.acceptedOn = moment('2000-08-27').toDate();
            encounter.accepted = true;
            await encounter.save();
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
