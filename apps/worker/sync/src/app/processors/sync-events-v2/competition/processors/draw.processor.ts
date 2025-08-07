import {
  DrawCompetition,
  EventEntry,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import { Sync, SyncQueue, TransactionManager } from "@badman/backend-queue";
import { VisualService, XmlDrawTypeID } from "@badman/backend-visual";
import { DrawType } from "@badman/utils";
import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";

@Processor({
  name: SyncQueue,
})
export class DrawCompetitionProcessor {
  private readonly logger = new Logger(DrawCompetitionProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue
  ) {}

  @Process(Sync.ProcessSyncCompetitionDraw)
  async ProcessSyncCompetitionDraw(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or derived
      eventCode: string;
      subEventId: string;
      rankingSystemId: string;

      // one or the other
      drawId: string;
      drawCode: number;

      // options
      options: {
        deleteDraw?: boolean;
        deleteEncounters?: boolean;
        deleteMatches?: boolean;
        deleteStandings?: boolean;

        updateMatches?: boolean;
        updateStanding?: boolean;
      };

      // from parent
      encounters: { id: string; visualCode: string; games: { id: string; visualCode: string }[] }[];
    }>
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    const options = {
      // update when we delete the draw (unless specified)
      updateMatches: job.data.options?.deleteDraw || false,
      updateStanding: job.data.options?.deleteDraw || false,
      ...job.data.options,
    };

    let draw: DrawCompetition;
    if (job.data.drawId) {
      draw = await DrawCompetition.findOne({
        where: {
          id: job.data.drawId,
        },
        transaction,
      });
    }

    const subEvent = await SubEventCompetition.findByPk(job.data.subEventId || draw.subeventId, {
      transaction,
    });
    if (!subEvent) {
      throw new Error("SubEvent not found");
    }

    if (!job.data.eventCode) {
      const event = await subEvent.getEventCompetition();
      if (!event) {
        throw new Error("Event not found");
      }

      job.data.eventCode = event.visualCode;
    }

    if (!draw && job.data.drawCode) {
      draw = await DrawCompetition.findOne({
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
    const existing = {
      existed: false,
      encounters: job.data?.encounters || [],
    };
    if (draw && options.deleteDraw) {
      this.logger.debug(`Deleting draw ${draw.name}`);

      // Clean up EventEntries first
      const eventEntries = await EventEntry.findAll({
        where: {
          drawId: draw.id,
          entryType: "competition",
        },
        transaction,
      });

      for (const entry of eventEntries) {
        await entry.destroy({ transaction });
      }

      await draw.destroy({ transaction });
      draw = undefined;
      existing.existed = true;
    }

    if (!drawCode) {
      throw new Error("Sub draw code is required");
    }

    const visualDraw = await this._visualService.getDraw(job.data.eventCode, drawCode, true);
    if (!visualDraw) {
      throw new Error("Sub draw not found");
    }

    if (!draw) {
      draw = new DrawCompetition();
    }
    if (drawId) {
      draw.id = drawId;
    }

    draw.subeventId = subEvent.id;
    draw.visualCode = visualDraw.Code;
    draw.name = visualDraw.Name;
    draw.size = visualDraw.Size;
    if (visualDraw.TypeID === XmlDrawTypeID.Elimination) {
      draw.type = DrawType.KO;
    } else if (
      visualDraw.TypeID === XmlDrawTypeID.RoundRobin ||
      visualDraw.TypeID === XmlDrawTypeID.FullRoundRobin
    ) {
      draw.type = DrawType.POULE;
    } else {
      draw.type = DrawType.QUALIFICATION;
    }

    await draw.save({ transaction });

    let gameJobIds = [];
    // if we request to update the draws or the event is new we need to process the matches
    if (options.updateMatches || !existing.existed) {
      gameJobIds = await this.processEncounters(
        job.data.eventCode,
        draw.visualCode,
        draw,
        job.data.rankingSystemId,
        job.data.transactionId,
        existing.encounters,
        options
      );
    }

    if (options.updateStanding || !existing.existed) {
      // also schedule a standing job
      const standingJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionDrawStanding, {
        transactionId: job.data.transactionId,
        drawId: draw.id,
        gameJobIds,
      });

      await this._transactionManager.addJob(job.data.transactionId, standingJob);
    }
  }

  private async processEncounters(
    eventCode: string,
    drawCode: string,
    draw: DrawCompetition,
    rankingSystemId: string,
    transactionId: string,
    encounters: {
      id: string;
      visualCode: string;
      games: { id: string; visualCode: string }[];
    }[],
    options: {
      deleteMatches?: boolean;
    }
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const matches = await this._visualService.getGames(eventCode, drawCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbEncounters = await draw.getEncounterCompetitions({
      transaction,
    });

    for (const dbEncounter of dbEncounters) {
      if (!matches.find((r) => `${r.Code}` === `${dbEncounter.visualCode}`)) {
        this.logger.debug(`Removing encounter ${dbEncounter.visualCode}`);
        await dbEncounter.destroy({ transaction });
      }
    }

    const gameJobIds = [];

    // queue the new sub events
    for (const match of matches) {
      // update sub events
      const matchJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionEncounter, {
        transactionId,
        subEventId: draw.subeventId,
        eventCode,
        rankingSystemId,
        drawId: draw.id,
        encounterCode: match.Code,
        encounterId: encounters?.find((r) => `${r.visualCode}` === `${match.Code}`)?.id,
        options,
      });

      await this._transactionManager.addJob(transactionId, matchJob);
      gameJobIds.push(matchJob.id);
    }

    return gameJobIds;
  }
}
