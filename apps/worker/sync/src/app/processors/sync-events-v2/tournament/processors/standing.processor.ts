import {
  DrawTournament,
  EventEntry,
  Game,
  GamePlayerMembership,
  Player,
  Standing,
} from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { GameStatus } from '@badman/utils';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, JobId } from 'bull';
import { Op, Transaction } from 'sequelize';

@Processor({
  name: SyncQueue,
})
export class StandingTournamentProcessor {
  private readonly logger = new Logger(StandingTournamentProcessor.name);

  constructor(private readonly _transactionManager: TransactionManager) {}

  @Process(Sync.ProcessSyncTournamentDrawStanding)
  async ProcessSyncTournamentDrawStanding(
    job: Job<{
      // transaction
      transactionId: string;

      drawId: string;
      gameJobIds: JobId[];

      // options
      options: {
        deleteStandings?: boolean;
      };
    }>,
  ): Promise<void> {
    this.logger.debug(`Processing draw standing for draw ${job.data.drawId}`);
    // check evey 3 seconds if the game jobs are finished
    while (
      !(await this._transactionManager.jobInTransactionFinished(
        job.data.transactionId,
        job.data.gameJobIds,
      ))
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.logger.debug(`All game job finished`);

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
    const games = await draw.getGames({
      transaction,
      include: [
        {
          model: Player,
        },
      ],
    });

    await this.destroyExisting(draw, transaction);
    const standings = await this.createEntriesAndStanding(draw, games, transaction);
    await this.calculateStandings(games, standings, draw, transaction);
  }

  private async calculateStandings(
    games: Game[],
    standings: Map<string, Standing>,
    draw: DrawTournament,
    transaction: Transaction,
  ) {
    for (const game of games) {
      if (game.status == GameStatus.WALKOVER || game.status == GameStatus.NO_MATCH) {
        continue;
      }

      const playert1p1 = game.players?.find(
        (e) => e.GamePlayerMembership.team == 1 && e.GamePlayerMembership.player == 1,
      );

      const playert2p1 = game.players?.find(
        (e) => e.GamePlayerMembership.team == 2 && e.GamePlayerMembership.player == 1,
      );

      if (!playert1p1 || !playert2p1) {
        this.logger.error(`Could not find players for game ${game.id}`);
        continue;
      }

      const t1Standing = standings.get(`${playert1p1?.id}`);
      const t2Standing = standings.get(`${playert2p1?.id}`);

      if (!t1Standing || !t2Standing) {
        this.logger.error(`Could not find standings for game ${game.id}`);
        continue;
      }

      // We played 1 encounter
      t1Standing.played++;
      t2Standing.played++;

      if (game.winner == 1) {
        t1Standing.gamesWon++;
        t2Standing.gamesLost++;

        t1Standing.points += 1;
      } else if (game.winner == 2) {
        t2Standing.gamesWon++;
        t1Standing.gamesLost++;

        t2Standing.points += 1;
      } else {
        this.logger.warn('Game is not finished yet');
      }

      if ((game.set1Team1 ?? 0) > (game.set1Team2 ?? 0)) {
        t1Standing.setsWon++;
        t2Standing.setsLost++;

        t1Standing.totalPointsWon += game.set1Team1 ?? 0;
        t1Standing.totalPointsLost += game.set1Team2 ?? 0;

        t2Standing.totalPointsLost += game.set1Team1 ?? 0;
        t2Standing.totalPointsWon += game.set1Team2 ?? 0;
      } else if ((game.set1Team1 ?? 0) < (game.set1Team2 ?? 0)) {
        t1Standing.setsLost++;
        t2Standing.setsWon++;

        t2Standing.totalPointsWon += game.set1Team2 ?? 0;
        t2Standing.totalPointsLost += game.set1Team1 ?? 0;

        t1Standing.totalPointsLost += game.set1Team2 ?? 0;
        t1Standing.totalPointsWon += game.set1Team1 ?? 0;
      }

      if ((game.set2Team1 ?? 0) > (game.set2Team2 ?? 0)) {
        t1Standing.setsWon++;
        t2Standing.setsLost++;

        t1Standing.totalPointsWon += game.set2Team1 ?? 0;
        t1Standing.totalPointsLost += game.set2Team2 ?? 0;

        t2Standing.totalPointsLost += game.set2Team1 ?? 0;
        t2Standing.totalPointsWon += game.set2Team2 ?? 0;
      } else if ((game.set2Team1 ?? 0) < (game.set2Team2 ?? 0)) {
        t1Standing.setsLost++;
        t2Standing.setsWon++;

        t2Standing.totalPointsWon += game.set2Team2 ?? 0;
        t2Standing.totalPointsLost += game.set2Team1 ?? 0;

        t1Standing.totalPointsLost += game.set2Team2 ?? 0;
        t1Standing.totalPointsWon += game.set2Team1 ?? 0;
      }

      if ((game.set3Team1 ?? 0) !== 0 && (game.set3Team2 ?? 0) !== 0) {
        if ((game.set3Team1 ?? 0) > (game.set3Team2 ?? 0)) {
          t1Standing.setsWon++;
          t2Standing.setsLost++;

          t1Standing.totalPointsWon += game.set3Team1 ?? 0;
          t1Standing.totalPointsLost += game.set3Team2 ?? 0;

          t2Standing.totalPointsLost += game.set3Team1 ?? 0;
          t2Standing.totalPointsWon += game.set3Team2 ?? 0;
        } else if ((game.set3Team1 ?? 0) < (game.set3Team2 ?? 0)) {
          t1Standing.setsLost++;
          t2Standing.setsWon++;

          t2Standing.totalPointsWon += game.set3Team2 ?? 0;
          t2Standing.totalPointsLost += game.set3Team1 ?? 0;

          t1Standing.totalPointsLost += game.set3Team2 ?? 0;
          t1Standing.totalPointsWon += game.set3Team1 ?? 0;
        }
      }
    }

    let position = 1;

    if (standings.size > 0) {
      let sorted = [...standings.values()]?.sort(this.sortStandings())?.map((acc) => {
        acc.position = position;
        acc.size = standings.size;

        // Calculate if the team is promoted or relegated based on the position and the draw's amount of risers/fallers
        if (draw.risers > 0 && position <= draw.risers) {
          acc.riser = true;
          acc.faller = false;
        } else if (draw.fallers > 0 && standings.size - position < draw.fallers) {
          acc.riser = false;
          acc.faller = true;
        }

        position++;
        return acc;
      });

      sorted = sorted.filter((a, i) => sorted.findIndex((s) => a.id === s.id) === i);

      await Standing.bulkCreate(
        sorted?.map((e) => e.toJSON()),
        {
          transaction,
          updateOnDuplicate: [
            'position',
            'played',
            'won',
            'lost',
            'tied',
            'points',
            'gamesWon',
            'gamesLost',
            'setsWon',
            'setsLost',
            'totalPointsWon',
            'totalPointsLost',
          ],
        },
      );
    }
  }

  private async createEntriesAndStanding(
    draw: DrawTournament,
    games: Game[],
    transaction: Transaction,
  ) {
    const processed = new Set<string>();
    const standings = new Map<string, Standing>();

    // creat a entry for each game
    for (const game of games) {
      const team1p1 = game?.players?.find(
        (player) =>
          player.GamePlayerMembership.team === 1 && player.GamePlayerMembership.player === 1,
      )?.id;

      const team1p2 = game?.players?.find(
        (player) =>
          player.GamePlayerMembership.team === 1 && player.GamePlayerMembership.player === 2,
      )?.id;

      if (team1p1 && !processed.has(team1p1)) {
        const entryTeam1 = new EventEntry({
          subEventId: draw.subeventId,
          entryType: 'tournament',
          drawId: draw.id,
          player1Id: team1p1,
          player2Id: team1p2,
        });

        const standingTeam1 = new Standing({
          entryId: entryTeam1.id,
        });

        await entryTeam1.save({ transaction });
        await standingTeam1.save({ transaction });

        processed.add(team1p1);
        processed.add(team1p2);

        standings.set(team1p1, standingTeam1);
      }

      const team2p1 = game?.players?.find(
        (player) =>
          player.GamePlayerMembership.team === 2 && player.GamePlayerMembership.player === 1,
      )?.id;

      const team2p2 = game?.players?.find(
        (player) =>
          player.GamePlayerMembership.team === 2 && player.GamePlayerMembership.player === 2,
      )?.id;

      if (team2p1 && !processed.has(team2p1)) {
        const entryTeam2 = new EventEntry({
          subEventId: draw.subeventId,
          entryType: 'tournament',
          drawId: draw.id,
          player1Id: team2p1,
          player2Id: team2p2,
        });

        const standingTeam2 = new Standing({
          entryId: entryTeam2.id,
        });

        await entryTeam2.save({ transaction });
        await standingTeam2.save({ transaction });

        processed.add(team2p1);
        processed.add(team2p2);

        standings.set(team2p1, standingTeam2);
      }
    }

    return standings;
  }

  private async destroyExisting(draw: DrawTournament, transaction: Transaction) {
    const entries = await EventEntry.findAll({
      where: {
        drawId: draw.id,
      },
    });

    // destroy all standing
    await Standing.destroy({
      where: {
        entryId: {
          [Op.in]: entries.map((entry) => entry.id),
        },
      },
      transaction,
    });

    // destroy entries
    await EventEntry.destroy({
      where: {
        drawId: draw.id,
      },
      transaction,
    });
  }

  private sortStandings(): (a: Standing, b: Standing) => number {
    return (a, b) => {
      if (a.points > b.points) {
        return -1;
      } else if (a.points < b.points) {
        return 1;
      }

      if (a.gamesWon > b.gamesWon) {
        return -1;
      } else if (a.gamesWon < b.gamesWon) {
        return 1;
      }

      if (a.setsWon > b.setsWon) {
        return -1;
      } else if (a.setsWon < b.setsWon) {
        return 1;
      }

      if (a.totalPointsWon > b.totalPointsWon) {
        return -1;
      } else if (a.totalPointsWon < b.totalPointsWon) {
        return 1;
      }

      return 0;
    };
  }
}
