import {
  Club,
  CronJob,
  DrawCompetition,
  EncounterCompetition,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { NotificationService } from '@badman/backend-notifications';
import { acceptCookies, getPage, signIn } from '@badman/backend-pupeteer';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { SearchService } from '@badman/backend-search';
import { ConfigType } from '@badman/utils';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import moment from 'moment';
import { Page } from 'puppeteer';
import { Op } from 'sequelize';
import {
  acceptEncounter,
  consentPrivacyAndCookie,
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
    required: true,
    include: [
      {
        model: Club,
        attributes: ['id', 'name', 'slug'],
      },
    ],
  },
  {
    model: Team,
    as: 'away',
    attributes: ['id', 'name'],
    required: true,
    include: [
      {
        model: Club,
        attributes: ['id', 'name', 'slug'],
      },
    ],
  },
  {
    required: true,
    attributes: ['id'],
    model: DrawCompetition,
    include: [
      {
        required: true,
        attributes: ['id', 'eventId'],
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
  ) {
    this._username = configService.get('VR_API_USER');
    this._password = configService.get('VR_API_PASS');
  }

  @Process(Sync.CheckEncounters)
  async syncEncounters() {
    this.logger.log('Syncing encounters');
    let page: Page | undefined;
    const cronJob = await CronJob.findOne({
      where: {
        'meta.jobName': Sync.CheckEncounters,
        'meta.queueName': SyncQueue,
      },
    });

    if (!cronJob) {
      throw new Error('Job not found');
    }

    if (cronJob.running) {
      this.logger.log('Job already running');
      return;
    }

    cronJob.amount++;
    await cronJob.save();

    try {
      // get all encounters that are not accepted yet within the last 14 days

      const encounters = await EncounterCompetition.findAndCountAll({
        attributes: ['id', 'visualCode', 'date', 'homeTeamId', 'awayTeamId'],
        where: {
          date: {
            [Op.between]: [moment().subtract(14, 'days').toDate(), moment().toDate()],
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
          if (page) {
            await page.close();
          }

          page = await getPage();
          page.setDefaultTimeout(10000);
          await page.setViewport({ width: 1691, height: 1337 });

          // Accept cookies
          await acceptCookies({ page }, {logger: this.logger});

          // Processing encounters
          for (const encounter of chunk) {
            await this.loadEvent(encounter);
            // if event is not found we can't continue
            if (!encounter?.drawCompetition?.subEventCompetition?.eventCompetition) {
              continue;
            }

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
      if (page) {
        await page.close();
      }

      cronJob.amount++;
      cronJob.lastRun = new Date();
      cronJob.running = false;
      await cronJob.save();

      this.logger.log('Synced encounters');
    }

    return true;
  }

  @Process(Sync.CheckEncounter)
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

    // Create browser
    const page = await getPage();
    try {
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await acceptCookies({ page }, {logger: this.logger});

      // Processing encounters
      await this._syncEncounter(encounter, page);

      await page.close();
    } catch (error) {
      this.logger.error(error);
    } finally {
      // Close browser
      if (page) {
        page.close();
      }

      this.logger.log('Synced encounters');
    }
  }

  /// Load the event for the encounter, we do this in a separate part
  /// because the nesting gets to deep and we can't parse the data then
  private async loadEvent(encounter: EncounterCompetition) {
    const event = await encounter.drawCompetition.subEventCompetition.getEventCompetition({
      attributes: ['id', 'visualCode', 'contactEmail', 'name', 'checkEncounterForFilledIn'],
      where: {
        checkEncounterForFilledIn: true,
      },
      include: [
        {
          model: Player,
          as: 'contact',
          attributes: ['id', 'email'],
        },
      ],
    });

    // set the event
    encounter.drawCompetition.subEventCompetition.eventCompetition = event;
  }

  private async _syncEncounter(encounter: EncounterCompetition, page: Page) {
    const url = await gotoEncounterPage({ page }, encounter);
    this.logger.debug(`Syncing encounter ${url}`);

    await consentPrivacyAndCookie({ page }, { logger: this.logger });

    try { 
      const time = await hasTime({ page }, { logger: this.logger });
      if (!time) {
        this.logger.verbose(`Encounter ${encounter.visualCode} has no time`);
        return;
      }
      const { entered, enteredOn } = await detailEntered({ page }, { logger: this.logger });
      const { accepted, acceptedOn } = await detailAccepted({ page }, { logger: this.logger });
      const { hasComment } = await detailComment({ page }, { logger: this.logger });
      const enteredMoment = moment(enteredOn);
      const hoursPassed = moment().diff(encounter.date, 'hour');

      this.logger.debug(
        `Encounter passed ${hoursPassed} hours ago, entered: ${entered}, accepted: ${accepted}, has comments: ${hasComment} ( ${url} )`,
      );
      // Check if we need to notify the event contact
      if (
        encounter?.drawCompetition?.subEventCompetition?.eventCompetition
          ?.checkEncounterForFilledIn ??
        false
      ) {
        // if we have a comment notify the event contact
        if (hasComment) {
          this.notificationService.notifyEncounterHasComment(encounter);
        }

        // not entered and passed 24 hours and no comment
        if (!entered && hoursPassed > 24 && !hasComment) {
          this.notificationService.notifyEncounterNotEntered(encounter);
        } else if (!accepted && hoursPassed > 48 && !hasComment) {
          // Check if it falls under the auto accept clubs
          if (encounter.away?.club?.slug && enteredMoment.isValid()) {
            let hoursPassedEntered = moment().diff(enteredMoment, 'hour');
            // was entered on time
            const enteredOnTime = enteredMoment.isSameOrBefore(
              moment(encounter.date).add(36, 'hour'),
            );
            if (!enteredOnTime) {
              // if entered late we give it 36 hours to comment after the encounter was filled in
              hoursPassedEntered = moment().diff(enteredMoment.clone().add(36, 'hour'), 'hour');
            }

            // Check if anough time has passed for auto accepting
            if (hoursPassedEntered > 36) {
              if (this.configService.get<boolean>('VR_ACCEPT_ENCOUNTERS')) {
                this.logger.debug(
                  `Auto accepting encounter ${encounter.visualCode} for club ${encounter.away.name}`,
                );
                await signIn({ page }, {username: this._username, password: this._password, logger: this.logger});
                const succesfull = await acceptEncounter({ page }, { logger: this.logger });
                if (!succesfull) {
                  // we failed to accept the encounter for some reason, notify the user
                  this.logger.warn(`Could not auto accept encounter ${encounter.visualCode}`);
                  this.notificationService.notifyEncounterNotAccepted(encounter);
                }
              } else {
                this.logger.debug(
                  `Not auto accepting encounters, auto accept is disabled ${encounter.away.name}`,
                );
              }
            } else {
              this.logger.debug(
                `Not (yet) auto accepting encounter ${encounter.visualCode} for club ${encounter.away.name}, entered on ${enteredOn} (${hoursPassedEntered} hours ago))`,
              );
            }
          } else {
            this.notificationService.notifyEncounterNotAccepted(encounter);
          }
        }
      }

      // Update our local data
      if (entered) {
        if (!enteredMoment.isValid()) {
          this.logger.error(
            `Entered on date is not valid: ${enteredOn} for encounter ${encounter.visualCode}`,
          );
          return;
        }

        encounter.enteredOn = enteredMoment.toDate();

        try {
          const { endedOn, startedOn, usedShuttle, gameLeader } = await detailInfo(
            { page },
            { logger: this.logger },
          );

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
