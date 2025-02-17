import { EventTournament, SubEventTournament } from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { VisualService } from '@badman/backend-visual';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import moment, { Moment } from 'moment';
import { Transaction } from 'sequelize';

@Processor({
  name: SyncQueue,
})
export class EventTournamentProcessor {
  private readonly logger = new Logger(EventTournamentProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ProcessSyncTournamentEvent)
  async ProcessSyncTournamentEvent(
    job: Job<{
      // transcation
      transactionId: string;

      // one or the other
      eventId: string;
      eventCode: string;

      // options
      options: {
        deleteEvent?: boolean;
        deleteSubEvent?: boolean;
        deleteDraw?: boolean;
        deleteMatches?: boolean;
        deleteStandings?: boolean;

        updateSubEvents?: boolean;
        updateDraws?: boolean;
        updateMatches?: boolean;
        updateStanding?: boolean;
      };
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    const options = {
      // update when we delete the event (unless specified)
      updateSubEvents: job.data.options?.deleteEvent || false,
      updateDraws: job.data.options?.deleteEvent || false,
      updateMatches: job.data.options?.deleteEvent || false,
      updateStanding: job.data.options?.deleteEvent || false,
      ...job.data.options,
    };
    let event: EventTournament;
    if (job.data.eventId) {
      event = await EventTournament.findOne({
        where: {
          id: job.data.eventId,
        },
        transaction,
      });
    }

    if (!event && job.data.eventCode) {
      event = await EventTournament.findOne({
        where: {
          visualCode: job.data.eventCode,
        },
        transaction,
      });
    }

    // delete the data and reuse the guid
    const tournamentid = event?.id;
    const tournemtnCode = event?.visualCode || job.data.eventCode;
    const existing = {
      existed: false,
      subEvents: [] as {
        id: string;
        visualCode: string;
        draws: { id: string; visualCode: string; games: { id: string; visualCode: string }[] }[];
      }[],
    };
    if (event && options.deleteEvent) {
      this.logger.debug(`Deleting event ${event.name}`);

      const subEvents = await event.getSubEventTournaments({
        transaction,
      });

      for (const subEvent of subEvents) {
        const existingSubEvents = await this.removeSubevent(subEvent, transaction);
        existing.subEvents.push(existingSubEvents);
      }

      await event.destroy({ transaction });
      event = undefined;

      existing.existed = true;
    }

    const visualTournament = await this._visualService.getTournament(tournemtnCode);

    const dates: Moment[] = [];
    for (
      let date = moment(visualTournament.StartDate);
      date.diff(visualTournament.EndDate, 'days') <= 0;
      date.add(1, 'days')
    ) {
      dates.push(date.clone());
    }

    if (!event) {
      event = new EventTournament();
    }

    if (tournamentid) {
      event.id = tournamentid;
    }

    event.name = visualTournament.Name;
    event.firstDay = visualTournament.StartDate;
    event.visualCode = visualTournament.Code;
    event.dates = dates.map((r) => r.toISOString()).join(',');
    event.tournamentNumber = visualTournament.Number;

    event.lastSync = new Date();
    await event.save({ transaction });
    this.logger.debug(`Event ${event.name} created`);

    // if we request to update the sub events or the event is new we need to process the sub events
    if (options.updateSubEvents || !existing.existed) {
      await this.processSubEvents(
        visualTournament.Code,
        event,
        job.data.transactionId,
        options,
        existing.subEvents,
      );
    }
  }

  private async processSubEvents(
    eventCode: string,
    event: EventTournament,
    transactionId: string,
    options: {
      deleteSubEvent?: boolean;
      deleteDraw?: boolean;
      deleteMatches?: boolean;
      deleteStandings?: boolean;

      updateDraws?: boolean;
      updateMatches?: boolean;
      updateStanding?: boolean;
    },
    existing: {
      id: string;
      visualCode: string;
      draws: { id: string; visualCode: string; games: { id: string; visualCode: string }[] }[];
    }[],
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const subEvents = await this._visualService.getSubEvents(eventCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbSubEvents = await event.getSubEventTournaments({
      transaction,
    });

    for (const dbSubEvent of dbSubEvents) {
      if (!subEvents.find((r) => `${r.Code}` === dbSubEvent.visualCode)) {
        this.logger.debug(`Removing sub event ${dbSubEvent.visualCode}`);

        // we need to delete the games first
        await this.removeSubevent(dbSubEvent, transaction);
      }
    }

    // queue the new sub events
    for (const xmlSubEvent of subEvents) {
      const existingSubEvent = existing.find((r) => `${r.visualCode}` === `${xmlSubEvent.Code}`);
      // update sub events
      const subEvnetJob = await this._syncQueue.add(Sync.ProcessSyncTournamentSubEvent, {
        transactionId,
        eventId: event.id,
        subEventCode: xmlSubEvent.Code,
        subEventId: existingSubEvent?.id,

        options,

        draws: existingSubEvent?.draws,
      });

      this._transactionManager.addJob(transactionId, subEvnetJob);
    }
  }

  private async removeSubevent(dbSubEvent: SubEventTournament, transaction: Transaction) {
    const existing = {
      id: dbSubEvent.id,
      visualCode: dbSubEvent.visualCode,
      draws: [] as {
        id: string;
        visualCode: string;
        games: { id: string; visualCode: string }[];
      }[],
    };

    const dbDraws = await dbSubEvent.getDrawTournaments({
      transaction,
    });

    for (const draw of dbDraws) {
      const existingDraw = {
        id: draw.id,
        visualCode: draw.visualCode,
        games: [],
      };

      const games = await draw.getGames({
        transaction,
      });

      for (const game of games) {
        existingDraw.games.push({
          id: game.id,
          visualCode: game.visualCode,
        });
        await game.destroy({ transaction });
      }

      existing.draws.push(existingDraw);
    }

    await dbSubEvent.destroy({ transaction });

    return existing;
  }
}
