import {
  DrawTournament,
  EventTournament,
  RankingSystem,
  SubEventTournament,
} from '@badman/backend-database';
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

      // provide or direved
      rankingSystemId: string;

      // we try to find the event
      eventCode: string;
      eventId: string;

      // one or the other
      subEventId: string;
      subEventCode: number;

      // options
      options: {
        deleteSubEvent?: boolean;
        deleteDraw?: boolean;
        deleteMatches?: boolean;
        deleteStandings?: boolean;

        updateDraws?: boolean;
        updateMatches?: boolean;
        updateStanding?: boolean;
      };

      // from parent
      draws: { id: string; visualCode: string; games: { id: string; visualCode: string }[] }[];
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    const options = {
      // update when we delete the event (unless specified)
      updateDraws: job.data.options?.deleteSubEvent || false,
      updateMatches: job.data.options?.deleteSubEvent || false,
      updateStanding: job.data.options?.deleteSubEvent || false,
      ...job.data.options,
    };

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

    if (!event && job.data.eventId) {
      event = await EventTournament.findByPk(job.data.eventId, {
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
    const existing = {
      existed: false,
      draws: job.data?.draws || [],
    };
    if (subEvent && options.deleteSubEvent) {
      this.logger.debug(`Deleting subevent ${subEvent.name}`);

      // remove all draws and games
      const draws = await subEvent.getDrawTournaments({
        transaction,
      });

      for (const draw of draws) {
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

      await subEvent.destroy({ transaction });
      subEvent = undefined;
      existing.existed = true;
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

    if (!subEvent) {
      subEvent = new SubEventTournament({
        id: subEventId? subEventId : undefined,
      });
    }


    subEvent.id = subEventId;
    subEvent.name = visualSubEvent.Name;
    subEvent.visualCode = visualSubEvent.Code;
    subEvent.eventType = this.getEventType(visualSubEvent);
    subEvent.gameType = this.getGameType(visualSubEvent);
    subEvent.eventId = event.id;
    subEvent.level = visualSubEvent.LevelID;

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
    if (options.updateDraws || !existing.existed) {
      await this.processDraws(
        event.visualCode,
        subEventCode,
        subEvent,
        primary.id,
        job.data.transactionId,
        options,
        existing.draws,
      );
    }
  }

  private async processDraws(
    eventCode: string,
    subEventCode: string,
    subEvent: SubEventTournament,
    rankingSystemId: string,
    transactionId: string,
    options: {
      deleteDraw?: boolean;
      deleteMatches?: boolean;
      deleteStandings?: boolean;

      updateMatches?: boolean;
      updateStanding?: boolean;
    },
    existing: { id: string; visualCode: string; games: { id: string; visualCode: string }[] }[],
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const draws = await this._visualService.getDraws(eventCode, subEventCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbDraws = await DrawTournament.findAll({
      where: {
        subeventId: subEvent.id,
      },
      transaction,
    });

    for (const dbDraw of dbDraws) {
      if (!draws.find((r) => `${r?.Code}` === `${dbDraw.visualCode}`)) {
        this.logger.debug(`Removing draw ${dbDraw.visualCode}`);

        const dbGames = await dbDraw.getGames({
          transaction,
        });

        for (const dbGame of dbGames) {
          await dbGame.destroy({ transaction });
        }

        await dbDraw.destroy({ transaction });
      }
    }

    // queue the new sub events
    for (const xmlSubEvent of draws) {
      const existingDraw = existing.find((r) => `${r.visualCode}` === `${xmlSubEvent?.Code}`);

      if (!xmlSubEvent?.Code){
        this.logger.warn(`No draw code found for sub event ${subEventCode}`);
        continue;
      }

      // update sub events
      const drawJob = await this._syncQueue.add(Sync.ProcessSyncTournamentDraw, {
        transactionId,
        subEventId: subEvent.id,
        eventCode,
        drawCode: xmlSubEvent?.Code,
        drawId: existingDraw?.id,
        rankingSystemId,
        options,
        games: existingDraw?.games,
      });

      this._transactionManager.addJob(transactionId, drawJob);
    }
  }

  private getGameType(xmlEvent: XmlTournamentEvent): GameType | undefined {
    switch (parseInt(`${xmlEvent.GameTypeID}`, 10)) {
      case XmlGameTypeID.Doubles:
        // Stupid fix but should work
        if (xmlEvent.GenderID === parseInt(`${XmlGenderID.Mixed}`, 10)) {
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
    switch (parseInt(`${xmlEvent.GenderID}`, 10)) {
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
