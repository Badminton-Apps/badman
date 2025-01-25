import { EventTournament, RankingSystem, SubEventTournament } from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import {
  VisualService,
  XmlGameTypeID,
  XmlGenderID,
  XmlTournamentEvent,
} from '@badman/backend-visual';
import { GameType, SubEventTypeEnum } from '@badman/utils';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class SubEventTournamentProcessor {
  private readonly logger = new Logger(SubEventTournamentProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ProcessSyncTournamentSubEvent)
  async ProcessSyncTournamentSubEvent(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or direed
      eventCode: string;
      rankingSystemId: string;

      // one or the other
      subEventId: string;
      subEventCode: number;

      // options
      updateMatches: boolean;
      updateDraws: boolean;
      updateStanding: boolean;
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    let subEvent: SubEventTournament;
    if (job.data.subEventId) {
      subEvent = await SubEventTournament.findOne({
        where: {
          id: job.data.subEventId,
        },
        transaction,
      });
    }
    let event;

    if (subEvent) {
      event = await subEvent.getEvent();
      if (event) {
        job.data.eventCode = event.visualCode;
      }
    }

    if (!event && job.data.eventCode) {
      event = await EventTournament.findOne({
        where: {
          visualCode: job.data.eventCode,
        },
        transaction,
      });
    }

    if (!event) {
      throw new Error('Event not found');
    }

    if (!subEvent && job.data.subEventCode) {
      subEvent = await SubEventTournament.findOne({
        where: {
          visualCode: job.data.subEventCode.toString(),
          eventId: event.id,
        },
        transaction,
      });
    }

    // delete the data and reuse the guid
    const subEventId = subEvent?.id;
    const subEventCode = subEvent?.visualCode || job.data.subEventCode.toString();
    let existed = false;
    if (subEvent) {
      this.logger.debug(`Deleting subevent ${subEvent.name}`);
      await subEvent.destroy({ transaction });
      existed = true;
    }

    if (!subEventCode) {
      throw new Error('Sub event code is required');
    }

    const visualSubEvent = await this._visualService.getSubEvent(
      event.visualCode,
      subEventCode,
      true,
    );
    if (!visualSubEvent) {
      throw new Error('Sub subevent not found');
    }

    subEvent = new SubEventTournament({
      id: subEventId,
      name: visualSubEvent.Name,
      visualCode: visualSubEvent.Code,
      eventType: this.getEventType(visualSubEvent),
      gameType: this.getGameType(visualSubEvent),
      eventId: event.id,
      level: visualSubEvent.LevelID,
    });

    const primary = await RankingSystem.findOne({
      where: { primary: true },
      transaction,
    });

    if (event.official) {
      if (primary) {
        const groups = await primary.getRankingGroups({
          transaction,
        });

        if (groups?.length > 0) {
          await subEvent.addRankingGroups(groups, {
            transaction,
          });
        }
      }
    }

    await subEvent.save({ transaction });

    // if we request to update the draws or the event is new we need to process the matches
    if (job.data.updateDraws || !existed) {
      await this.processDraws(
        event.visualCode,
        subEventCode,
        subEvent,
        primary.id,
        job.data.transactionId,
        job.data.updateMatches,
        job.data.updateStanding,
      );
    }
  }

  private async processDraws(
    eventCode: string,
    subEventCode: string,
    subEvent: SubEventTournament,
    rankingSystemId: string,
    transactionId: string,
    updateMatches: boolean,
    updateStanding: boolean,
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const draws = await this._visualService.getDraws(eventCode, subEventCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbDraws = await subEvent.getDrawTournaments({
      transaction,
    });

    for (const dbDraw of dbDraws) {
      if (!draws.find((r) => r.Code === dbDraw.visualCode)) {
        this.logger.debug(`Removing sub event ${dbDraw.visualCode}`);
        await dbDraw.destroy({ transaction });
      }
    }

    // queue the new sub events
    for (const xmlSubEvent of draws) {
      // update sub events
      const drawJob = await this._syncQueue.add(Sync.ProcessSyncTournamentDraw, {
        transactionId,
        subEventId: subEvent.id,
        eventCode,
        drawCode: xmlSubEvent.Code,
        rankingSystemId,

        updateMatches,
        updateStanding,
      });

      this._transactionManager.addJob(transactionId, drawJob);
    }
  }

  private getGameType(xmlEvent: XmlTournamentEvent): GameType | undefined {
    switch (xmlEvent.GameTypeID) {
      case XmlGameTypeID.Doubles:
        // Stupid fix but should work
        if (xmlEvent.GenderID === XmlGenderID.Mixed) {
          return GameType.MX;
        } else {
          return GameType.D;
        }
      case XmlGameTypeID.Singles:
        return GameType.S;
      case XmlGameTypeID.Mixed:
        return GameType.MX;
      default:
        this.logger.warn('No Game type found');
        return;
    }
  }

  private getEventType(xmlEvent: XmlTournamentEvent): SubEventTypeEnum | undefined {
    switch (xmlEvent.GenderID) {
      case XmlGenderID.Male:
      case XmlGenderID.Boy:
        return SubEventTypeEnum.M;
      case XmlGenderID.Female:
      case XmlGenderID.Girl:
        return SubEventTypeEnum.F;
      case XmlGenderID.Mixed:
        return SubEventTypeEnum.MX;
      default:
        this.logger.warn('No event type found');
        return;
    }
  }
}
