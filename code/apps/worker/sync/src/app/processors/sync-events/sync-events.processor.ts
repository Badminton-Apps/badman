import { Sync, SyncQueue } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import moment = require('moment');
import { Sequelize } from 'sequelize-typescript';
import { VisualService } from '../../services';
import { XmlTournamentTypeID } from '../../utils';
import { CompetitionSyncer } from './competition-sync';
import { TournamentSyncer } from './tournament-sync';

@Processor({
  name: SyncQueue,
})
export class SyncEventsProcessor {
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;

  private readonly logger = new Logger(SyncEventsProcessor.name);

  constructor(
    private visualService: VisualService,
    private _sequelize: Sequelize
  ) {
    this.logger.debug('SyncEvents');

    this._competitionSync = new CompetitionSyncer(this.visualService);
    this._tournamentSync = new TournamentSyncer(this.visualService);
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
      // Only types / event names
      only: string[];
      // Continue from a previous (failed) run
      offset: number;
      // Only process a certain number of events
      limit: number;
    }>
  ) {
    const newDate = moment(job.data?.date);
    let newEvents = await this.visualService.getChangeEvents(newDate);

    newEvents = newEvents.sort((a, b) => {
      return moment(a.StartDate).valueOf() - moment(b.StartDate).valueOf();
    });

    if (job.data?.startDate) {
      newEvents = newEvents.filter((e) => {
        return moment(e.StartDate).isSameOrAfter(job.data?.startDate);
      });
    }

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
      this.logger.log(
        `Processing ${xmlTournament.Name}, ${percent}% (${i}/${total})`
      );
      const transaction = await this._sequelize.transaction();

      try {
        // Skip certain events
        if (
          (job.data?.skip?.length ?? 0) > 0 &&
          job.data?.skip?.includes(xmlTournament.Name)
        ) {
          await transaction.commit();
          continue;
        }

        // Only process certain events
        if (
          (job.data?.only?.length ?? 0) > 0 &&
          !job.data?.only?.includes(xmlTournament.Name)
        ) {
          await transaction.commit();
          continue;
        }

        if (
          xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          if (job.data?.skip?.includes('competition')) {
            await transaction.commit();
            continue;
          }

          await this._competitionSync.process({
            transaction,
            xmlTournament,
            options: { ...job.data },
          });
        } else {
          if (job.data?.skip?.includes('tournament')) {
            await transaction.commit();
            continue;
          }

          await this._tournamentSync.process({
            transaction,
            xmlTournament,
            options: { ...job.data },
          });
        }
        await transaction.commit();
        this.logger.log(`Finished ${xmlTournament.Name}`);
      } catch (e) {
        this.logger.error('Rollback', e);
        await transaction.rollback();
        throw e;
      }
    }

    this.logger.log('Finished sync of Visual scores');
  }
}
