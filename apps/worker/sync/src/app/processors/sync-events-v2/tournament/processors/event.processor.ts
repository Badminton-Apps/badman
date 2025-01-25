import { EventTournament } from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { VisualService } from '@badman/backend-visual';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import moment, { Moment } from 'moment';

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
      updateSubEvents: boolean;
      updateDraws: boolean;
      updateMatches: boolean;
      updateStanding: boolean;
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

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
    let existed = false;
    if (event) {
      this.logger.debug(`Deleting event ${event.name}`);
      await event.destroy({ transaction });
      existed = true;
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

    this.logger.debug(`EventTournament ${visualTournament.Name} not found, creating`);
    event = new EventTournament({
      // we reuse the guid so if anyone has bookmarked it they will still get the correct data
      id: tournamentid,
      name: visualTournament.Name,
      firstDay: visualTournament.StartDate,
      visualCode: visualTournament.Code,
      dates: dates.map((r) => r.toISOString()).join(','),
      tournamentNumber: visualTournament.Number,
    });

    event.lastSync = new Date();
    await event.save({ transaction });

    // if we request to update the sub events or the event is new we need to process the sub events
    if (job.data.updateSubEvents || !existed) {
      await this.processSubEvents(
        visualTournament.Code,
        event,
        job.data.transactionId,
        job.data.updateDraws,
        job.data.updateMatches,
        job.data.updateStanding,
      );
    }

    this.logger.debug(`Event ${event.name} created`);
  }

  private async processSubEvents(
    eventCode: string,
    event: EventTournament,
    transactionId: string,
    updateDraws: boolean,
    updateMatches: boolean,
    updateStanding: boolean
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const subEvents = await this._visualService.getSubEvents(eventCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbSubEvents = await event.getSubEventTournaments({
      transaction,
    });

    for (const dbSubEvent of dbSubEvents) {
      if (!subEvents.find((r) => r.Code === dbSubEvent.visualCode)) {
        this.logger.debug(`Removing sub event ${dbSubEvent.visualCode}`);
        await dbSubEvent.destroy({ transaction });
      }
    }

    // queue the new sub events
    for (const xmlSubEvent of subEvents) {
      // update sub events
      const subEvnetJob = await this._syncQueue.add(Sync.ProcessSyncTournamentSubEvent, {
        transactionId,
        eventId: event.id,
        subEventCode: xmlSubEvent.Code,

        updateDraws,
        updateMatches,
        updateStanding,
      });

      this._transactionManager.addJob(transactionId, subEvnetJob);
    }
  }
}
