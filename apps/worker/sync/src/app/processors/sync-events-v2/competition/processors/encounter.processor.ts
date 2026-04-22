import { DrawCompetition, EncounterCompetition, RankingSystem } from "@badman/backend-database";
import { Sync, SyncQueue, TransactionManager } from "@badman/backend-queue";
import { VisualService } from "@badman/backend-visual";
import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";

@Processor({
  name: SyncQueue,
})
export class EncounterCompetitionProcessor {
  private readonly logger = new Logger(EncounterCompetitionProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue
  ) {}

  @Process(Sync.ProcessSyncCompetitionEncounter)
  async ProcessSyncCompetitionEncounter(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or derived
      eventCode: string;
      subEventId: string;
      drawId: string;
      rankingSystemId: string;

      // one or the other
      encounterId: string;
      encounterCode: number;

      // options
      options: {
        deleteEncounter?: boolean;
        deleteMatches?: boolean;
        deleteStandings?: boolean;

        updateMatches?: boolean;
        updateStanding?: boolean;
      };

      // from parent
      games: { id: string; visualCode: string }[];
    }>
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    const options = {
      // update when we delete the Encounter (unless specified)
      updateMatches: job.data.options?.deleteEncounter || false,
      updateStanding: job.data.options?.deleteEncounter || false,
      ...job.data.options,
    };

    let encounter: EncounterCompetition;
    if (job.data.encounterId) {
      encounter = await EncounterCompetition.findOne({
        where: {
          id: job.data.encounterId,
        },
        transaction,
      });
    }

    const dbDraw = await DrawCompetition.findByPk(job.data.drawId || encounter.drawId, {
      transaction,
    });
    if (!dbDraw) {
      throw new Error("SubEvent not found");
    }

    if (!job.data.eventCode) {
      const subEvent = await dbDraw.getSubEventCompetition();
      const event = await subEvent.getEventCompetition();
      if (!event) {
        throw new Error("Event not found");
      }

      job.data.eventCode = event.visualCode;
    }

    if (!encounter && job.data.encounterCode) {
      encounter = await EncounterCompetition.findOne({
        where: {
          visualCode: job.data.encounterCode.toString(),
          drawId: dbDraw.id,
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
    const EncounterId = encounter?.id;
    const EncounterCode = encounter?.visualCode || job.data.encounterCode.toString();
    const existing = {
      existed: false,
      games: job.data?.games || [],
    };
    if (encounter && options.deleteEncounter) {
      this.logger.debug(`Deleting Encounter ${encounter.visualCode}`);

      const games = await encounter.getGames({
        transaction,
      });

      for (const game of games) {
        existing.games.push({
          id: game.id,
          visualCode: game.visualCode,
        });
        await game.destroy({ transaction });
      }

      await encounter.destroy({ transaction });
      encounter = undefined;
      existing.existed = true;
    }

    if (!EncounterCode) {
      throw new Error("Sub Encounter code is required");
    }

    const visualEncounters = await this._visualService.getGames(
      job.data.eventCode,
      EncounterCode,
      true
    );

    const visualEncounter = visualEncounters.find((r) => `${r.Code}` === `${EncounterCode}`);

    if (!visualEncounter) {
      throw new Error("Sub Encounter not found");
    }

    if (!encounter) {
      encounter = new EncounterCompetition();
    }
    if (EncounterId) {
      encounter.id = EncounterId;
    }

    encounter.visualCode = visualEncounter.Code;

    await encounter.save({ transaction });

    let gameJobIds = [];
    // if we request to update the Encounters or the event is new we need to process the matches
    if (options.updateMatches || !existing.existed) {
      gameJobIds = await this.processGames(
        job.data.eventCode,
        encounter.visualCode,
        encounter,
        job.data.rankingSystemId,
        job.data.transactionId,
        existing.games,
        options
      );
    }

    if (options.updateStanding || !existing.existed) {
      // also schedule a standing job
      const standingJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionDrawStanding, {
        transactionId: job.data.transactionId,
        EncounterId: encounter.id,
        gameJobIds,
      });

      await this._transactionManager.addJob(job.data.transactionId, standingJob);
    }
  }

  private async processGames(
    eventCode: string,
    encounterCode: string,
    encounter: EncounterCompetition,
    rankingSystemId: string,
    transactionId: string,
    games: { id: string; visualCode: string }[],
    options: {
      deleteMatches?: boolean;
    }
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const matches = await this._visualService.getGames(eventCode, encounterCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbGames = await encounter.getGames({
      transaction,
    });

    for (const dbGame of dbGames) {
      if (!matches.find((r) => `${r.Code}` === `${dbGame.visualCode}`)) {
        this.logger.debug(`Removing game ${dbGame.visualCode}`);
        await dbGame.destroy({ transaction });
      }
    }

    const gameJobIds = [];

    // queue the new sub events
    for (const match of matches) {
      // update sub events
      const matchJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionGame, {
        transactionId,
        drawId: encounter.drawId,
        eventCode,
        rankingSystemId,
        encounterId: encounter.id,
        gameCode: match.Code,
        gameId: games?.find((r) => `${r.visualCode}` === `${match.Code}`)?.id,
        options,
      });

      await this._transactionManager.addJob(transactionId, matchJob);
      gameJobIds.push(matchJob.id);
    }

    return gameJobIds;
  }

  // private async getTeam(draw: DrawCompetition, teamName: string) {
  //   const entries = await draw.getEventEntries();
  // }
}
