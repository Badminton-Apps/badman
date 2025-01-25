import { DrawTournament, RankingSystem, SubEventTournament } from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { VisualService, XmlDrawTypeID } from '@badman/backend-visual';
import { JobsService } from '@badman/frontend-queue';
import { DrawType } from '@badman/utils';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class DrawTournamentProcessor {
  private readonly logger = new Logger(DrawTournamentProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ProcessSyncTournamentDraw)
  async ProcessSyncTournamentDraw(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or direed
      eventCode: string;
      subEventId: string;
      rankingSystemId: string;

      // one or the other
      drawId: string;
      drawCode: number;

      // options
      updateMatches: boolean;
      updateStanding: boolean;
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    let draw: DrawTournament;
    if (job.data.drawId) {
      draw = await DrawTournament.findOne({
        where: {
          id: job.data.drawId,
        },
        transaction,
      });
    }

    const subEvent = await SubEventTournament.findByPk(job.data.subEventId || draw.subeventId, {
      transaction,
    });
    if (!subEvent) {
      throw new Error('SubEvent not found');
    }

    if (!job.data.eventCode) {
      const event = await subEvent.getEvent();
      if (!event) {
        throw new Error('Event not found');
      }

      job.data.eventCode = event.visualCode;
    }

    if (!draw && job.data.drawCode) {
      draw = await DrawTournament.findOne({
        where: {
          visualCode: job.data.drawCode.toString(),
          subeventId: subEvent.id,
        },
        transaction,
      });
    }

    if (!job.data.rankingSystemId) {
      job.data.rankingSystemId = (
        await RankingSystem.findOne({
          where: {
            primary: true,
          },
        })
      ).id;
    }

    // delete the data and reuse the guid
    const drawId = draw?.id;
    const drawCode = draw?.visualCode || job.data.drawCode.toString();
    let existed = false;
    if (draw) {
      this.logger.debug(`Deleting draw ${draw.name}`);
      await draw.destroy({ transaction });
      existed = true;
    }

    if (!drawCode) {
      throw new Error('Sub draw code is required');
    }

    const visualDraw = await this._visualService.getDraw(job.data.eventCode, drawCode, true);
    if (!visualDraw) {
      throw new Error('Sub draw not found');
    }

    draw = new DrawTournament({
      id: drawId,
      subeventId: subEvent.id,
      visualCode: visualDraw.Code,
      name: visualDraw.Name,
      size: visualDraw.Size,
      type:
        visualDraw.TypeID === XmlDrawTypeID.Elimination
          ? DrawType.KO
          : visualDraw.TypeID === XmlDrawTypeID.RoundRobin ||
              visualDraw.TypeID === XmlDrawTypeID.FullRoundRobin
            ? DrawType.POULE
            : DrawType.QUALIFICATION,
    });

    await draw.save({ transaction });

    let gameJobIds = [];
    // if we request to update the draws or the event is new we need to process the matches
    if (job.data.updateMatches || !existed) {
      gameJobIds = await this.processGames(
        job.data.eventCode,
        draw.visualCode,
        draw,
        job.data.rankingSystemId,
        job.data.transactionId,
      );
    }

    if (job.data.updateStanding || !existed) {
      // also schedule a standing job
      const standingJob = await this._syncQueue.add(Sync.ProcessSyncTournamentDrawStanding, {
        transactionId: job.data.transactionId,
        drawId: draw.id,
        gameJobIds,
      });

      await this._transactionManager.addJob(job.data.transactionId, standingJob);
    }
  }

  private async processGames(
    eventCode: string,
    drawCode: string,
    draw: DrawTournament,
    rankingSystemId: string,
    transactionId: string,
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const matches = await this._visualService.getMatches(eventCode, drawCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbGames = await draw.getGames({
      transaction,
    });

    for (const dbGame of dbGames) {
      if (!matches.find((r) => r.Code === dbGame.visualCode)) {
        this.logger.debug(`Removing game ${dbGame.visualCode}`);
        await dbGame.destroy({ transaction });
      }
    }

    const gameJobIds = [];

    // queue the new sub events
    for (const match of matches) {
      // update sub events
      const matchJob = await this._syncQueue.add(Sync.ProcessSyncTournamentMatch, {
        transactionId,
        subEventId: draw.subeventId,
        eventCode,
        rankingSystemId,
        drawId: draw.id,
        gameCode: match.Code,
      });

      await this._transactionManager.addJob(transactionId, matchJob);
      gameJobIds.push(matchJob.id);
    }

    return gameJobIds;
  }
}
