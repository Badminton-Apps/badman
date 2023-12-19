import { Sync, SyncQueue } from '@badman/backend-queue';
import { PointsService } from '@badman/backend-ranking';
import {
  VisualService,
  XmlTournament,
  XmlTournamentTypeID,
} from '@badman/backend-visual';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { CompetitionSyncer } from './competition-sync';
import { TournamentSyncer } from './tournament-sync';
import moment from 'moment';
import { NotificationService } from '@badman/backend-notifications';
import {
  CronJob,
  EventCompetition,
  EventTournament,
} from '@badman/backend-database';

@Processor({
  name: SyncQueue,
})
export class SyncEventsProcessor {
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;

  private readonly logger = new Logger(SyncEventsProcessor.name);
  private formats = [
    'https://www.toernooi.nl/sport/league?id=',
    'https://www.badmintonvlaanderen.be/sport/tournament?id=',
    'https://www.toernooi.nl/tournament/',
    'https://www.badmintonvlaanderen.be/tournament/',
  ];

  constructor(
    pointService: PointsService,
    private notificationService: NotificationService,
    private visualService: VisualService,
    private _sequelize: Sequelize,
  ) {
    this._competitionSync = new CompetitionSyncer(
      this.visualService,
      pointService,
    );
    this._tournamentSync = new TournamentSyncer(
      this.visualService,
      pointService,
    );
  }

  @Process(Sync.SyncEvents)
  async syncEvents(
    job: Job<{
      // Changed after date
      date?: Date;
      // Start from certain date
      startDate?: Date;
      // Skip types / event names
      skip: string[];
      // Search for namne
      search: string;
      // Exact id
      id: string | string[];
      // Official
      official?: boolean;
      // Only types / event names
      only: string[];
      // Continue from a previous (failed) run
      offset: number;
      // Only process a certain number of events
      limit: number;
      // the to notifiy user
      userId?: string | string[];
    }>,
  ) {
    const cronJob = await CronJob.findOne({
      where: {
        name: 'Sync Events',
      },
    });

    if (!cronJob) {
      throw new Error('Job not found');
    }

    if (cronJob.running) {
      this.logger.log('Job already running');
      return;
    }

    cronJob.running = true;
    await cronJob.save();

    try {
      const newDate = moment(job.data?.date ?? cronJob.lastRun);
      let newEvents: XmlTournament[] = [];
      if (job.data?.search?.length > 0) {
        newEvents = newEvents.concat(
          await this.visualService.searchEvents(job.data?.search),
        );
      } else if (job.data?.id?.length > 0) {
        if (!Array.isArray(job.data?.id)) {
          job.data.id = [job.data.id];
        }
        for (let id of job.data?.id as string[]) {
          for (const format of this.formats) {
            if (id.startsWith(format)) {
              id = id.replace(format, '');
            }
          }

          newEvents = newEvents.concat(await this.visualService.getEvent(id));
        }
      } else {
        newEvents = newEvents.concat(
          await this.visualService.getChangeEvents(newDate),
        );
      }
      newEvents = newEvents.sort((a, b) => {
        return moment(a.StartDate).valueOf() - moment(b.StartDate).valueOf();
      });

      this.logger.verbose(`Found ${newEvents.length} new events`);

      if (job.data?.startDate) {
        newEvents = newEvents.filter((e) => {
          return moment(e.StartDate).isSameOrAfter(job.data?.startDate);
        });
      }

      this.logger.verbose(
        `Found ${newEvents.length} new events after ${job.data?.startDate}`,
      );

      let toProcess = newEvents.length;
      if (job.data?.limit) {
        toProcess = job.data?.offset ?? 0 + job.data?.limit;
      }

      this.logger.debug(`Processing ${toProcess} events`);

      for (let i = job.data?.offset ?? 0; i < toProcess; i++) {
        const xmlTournament = newEvents[i];
        const current = i + 1;
        const total = toProcess;
        const percent = Math.round((current / total) * 10000) / 100;
        job.progress(percent);
        this.logger.debug(
          `Processing ${xmlTournament?.Name}, ${percent}% (${i}/${total})`,
        );

        // Skip certain events
        if (
          (job.data?.skip?.length ?? 0) > 0 &&
          job.data?.skip?.includes(xmlTournament?.Name)
        ) {
          continue;
        }

        // Only process certain events
        if (
          (job.data?.only?.length ?? 0) > 0 &&
          !job.data?.only?.includes(xmlTournament?.Name)
        ) {
          continue;
        }

        const transaction = await this._sequelize.transaction();

        try {
          let resultData: { event: EventCompetition | EventTournament } | null =
            null;
          if (
            xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
            xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
          ) {
            // // National is a bit different have to lookinto, temp skip
            // if (xmlTournament?.Name?.includes('Victor League')) {
            //   continue;
            // }

            if (!job.data?.skip?.includes('competition')) {
              resultData = (await this._competitionSync.process({
                transaction,
                xmlTournament,
                options: { ...job.data },
              })) as { event: EventCompetition };
            }
          } else {
            if (!job.data?.skip?.includes('tournament')) {
              resultData = (await this._tournamentSync.process({
                transaction,
                xmlTournament,
                options: { ...job.data },
              })) as { event: EventTournament };
            }
          }
          this.logger.debug(`Committing transactin`);
          await transaction.commit();
          this.logger.log(`Finished ${xmlTournament?.Name}`);

          if (job.data?.userId) {
            const userIds = Array.isArray(job.data?.userId)
              ? job.data?.userId
              : [job.data?.userId];

            for (const userId of userIds) {
              await this.notificationService.notifySyncFinished(userId, {
                event: resultData?.event,
                success: true,
              });
            }
          }
        } catch (e) {
          this.logger.error('Rollback', e);
          await transaction.rollback();

          if (job.data?.userId) {
            const userIds = Array.isArray(job.data?.userId)
              ? job.data?.userId
              : [job.data?.userId];

            for (const userId of userIds) {
              await this.notificationService.notifySyncFinished(userId, {
                event: {
                  name: xmlTournament.Name,
                } as EventTournament,
                success: false,
              });
            }
          }
          throw e;
        }
      }
    } catch (e) {
      this.logger.error('Error', e);

      throw e;
    } finally {
      cronJob.running = false;
      cronJob.lastRun = new Date();
      await cronJob.save();
    }

    this.logger.log('Finished sync of Visual scores');
  }
}
