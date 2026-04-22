import { EncounterGamesGenerationService } from "@badman/backend-encounter-games";
import { DrawCompetition, EncounterCompetition, RankingSystem } from "@badman/backend-database";
import { Sync, SyncQueue, TransactionManager } from "@badman/backend-queue";
import { VisualService, XmlMatch } from "@badman/backend-visual";
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
    private readonly _encounterGamesGenerationService: EncounterGamesGenerationService,
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
        // Protect scored games from destruction
        if (game.set1Team1 != null || game.set1Team2 != null) {
          continue;
        }
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

    const visualEncounter = visualEncounters.find((r) => r.Code === EncounterCode);

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

    // Ensure 8 local game slots exist before syncing toernooi data.
    // Idempotent: skips orders already present (including any toernooi-synced games).
    await this._encounterGamesGenerationService.generateGames(encounter.id, transaction);

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
    // Per-encounter call returns individual games (XmlMatch), never XmlTeamMatch.
    const matches = (await this._visualService.getGames(
      eventCode,
      encounterCode,
      true
    )) as XmlMatch[];

    const dbGames = await encounter.getGames({ transaction });

    // Skip toernooi matches whose corresponding local slot already has scores.
    const skipCodes = new Set<string>();
    // Map local (unscored) game slots by order so toernooi data can be merged in place.
    const localGameIdByOrder = new Map<number, string>();

    for (const dbGame of dbGames) {
      if (!dbGame.visualCode) {
        // Local placeholder: find toernooi match targeting the same slot (by order).
        const match = matches.find((m) => m.MatchOrder === dbGame.order);
        if (!match) continue;

        const hasScores = dbGame.set1Team1 != null || dbGame.set1Team2 != null;
        if (hasScores) {
          // Local scores win — leave the local game untouched and skip the toernooi match.
          skipCodes.add(`${match.Code}`);
        } else {
          // Toernooi wins — let the game job update the existing local game in place.
          localGameIdByOrder.set(dbGame.order, dbGame.id);
        }
        continue;
      }

      // Synced game: destroy if no longer in the toernooi response.
      if (!matches.find((r) => r.Code === dbGame.visualCode)) {
        this.logger.debug(`Removing game ${dbGame.visualCode}`);
        await dbGame.destroy({ transaction });
      }
    }

    const gameJobIds = [];

    for (const match of matches) {
      if (skipCodes.has(`${match.Code}`)) {
        this.logger.debug(
          `Skipping toernooi match ${match.Code} — local slot already has scores`
        );
        continue;
      }

      const localGameId = localGameIdByOrder.get(match.MatchOrder);
      const existingGameId =
        localGameId ?? games?.find((r) => r.visualCode === match.Code)?.id;

      const matchJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionGame, {
        transactionId,
        drawId: encounter.drawId,
        encounterId: encounter.id,
        encounterVisualCode: encounter.visualCode,
        eventCode,
        rankingSystemId,
        gameCode: match.Code,
        gameId: existingGameId,
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
