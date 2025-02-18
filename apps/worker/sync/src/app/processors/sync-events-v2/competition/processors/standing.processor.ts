import {
  DrawCompetition,
  EncounterCompetition,
  EventEntry,
  Player,
  Standing,
} from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, JobId } from 'bull';
import { Op, Transaction } from 'sequelize';

@Processor({
  name: SyncQueue,
})
export class StandingCompetitionProcessor {
  private readonly logger = new Logger(StandingCompetitionProcessor.name);

  constructor(private readonly _transactionManager: TransactionManager) {}

  @Process(Sync.ProcessSyncCompetitionDrawStanding)
  async ProcessSyncCompetitionDrawStanding(
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

    let draw: DrawCompetition;
    if (job.data.drawId) {
      draw = await DrawCompetition.findOne({
        where: {
          id: job.data.drawId,
        },
        transaction,
      });
    }

    const encounters = await draw.getEncounterCompetitions({
      transaction,
      include: [
        {
          model: Player,
        },
      ],
    });

    await this.destroyExisting(draw, transaction);
    const standings = await this.createEntriesAndStanding(draw, encounters, transaction);
    await this.calculateStandings(encounters, standings, draw, transaction);
  }

  private async calculateStandings(
    encounters: EncounterCompetition[],
    standings: Map<string, Standing>,
    draw: DrawCompetition,
    transaction: Transaction,
  ) {
    for (const encounter of encounters) {
      if (!encounter.homeTeamId || !encounter.awayTeamId) {
        continue;
      }

      const homeStanding = standings.get(encounter.homeTeamId);
      const awayStanding = standings.get(encounter.awayTeamId);

      // We played 1 encounter
      homeStanding.played = (homeStanding.played ?? 0) + 1;
      awayStanding.played = (awayStanding.played ?? 0) + 1;

      if (encounter.homeScore > encounter.awayScore) {
        homeStanding.won++;
        awayStanding.lost++;

        // 2 points won
        homeStanding.points += 2;
      } else if (encounter.homeScore < encounter.awayScore) {
        homeStanding.lost++;
        awayStanding.won++;

        // 2 points won
        awayStanding.points += 2;
      } else {
        homeStanding.tied++;
        awayStanding.tied++;

        // 1 point for a draw
        homeStanding.points++;
        awayStanding.points++;
      }

      const encoutnerGames = await encounter.getGames({
        transaction,
      });

      for (const game of encoutnerGames ?? []) {
        if (game.winner == 1) {
          homeStanding.gamesWon++;
          awayStanding.gamesLost++;
        } else {
          awayStanding.gamesWon++;
          homeStanding.gamesLost++;
        }

        if ((game.set1Team1 ?? 0) > (game.set1Team2 ?? 0)) {
          homeStanding.setsWon++;
          awayStanding.setsLost++;

          homeStanding.totalPointsWon += game.set1Team1 ?? 0;
          homeStanding.totalPointsLost += game.set1Team2 ?? 0;

          awayStanding.totalPointsLost += game.set1Team1 ?? 0;
          awayStanding.totalPointsWon += game.set1Team2 ?? 0;
        } else if ((game.set1Team1 ?? 0) < (game.set1Team2 ?? 0)) {
          homeStanding.setsLost++;
          awayStanding.setsWon++;

          homeStanding.totalPointsWon += game.set1Team1 ?? 0;
          homeStanding.totalPointsLost += game.set1Team2 ?? 0;

          awayStanding.totalPointsLost += game.set1Team1 ?? 0;
          awayStanding.totalPointsWon += game.set1Team2 ?? 0;
        }

        if ((game.set2Team1 ?? 0) > (game.set2Team2 ?? 0)) {
          homeStanding.setsWon++;
          awayStanding.setsLost++;

          homeStanding.totalPointsWon += game.set2Team1 ?? 0;
          homeStanding.totalPointsLost += game.set2Team2 ?? 0;

          awayStanding.totalPointsLost += game.set2Team1 ?? 0;
          awayStanding.totalPointsWon += game.set2Team2 ?? 0;
        } else if ((game.set2Team1 ?? 0) < (game.set2Team2 ?? 0)) {
          homeStanding.setsLost++;
          awayStanding.setsWon++;

          homeStanding.totalPointsWon += game.set2Team1 ?? 0;
          homeStanding.totalPointsLost += game.set2Team2 ?? 0;

          awayStanding.totalPointsLost += game.set2Team1 ?? 0;
          awayStanding.totalPointsWon += game.set2Team2 ?? 0;
        }

        if ((game.set3Team1 ?? 0) !== 0 && (game.set3Team2 ?? 0) !== 0) {
          if ((game.set3Team1 ?? 0) > (game.set3Team2 ?? 0)) {
            homeStanding.setsWon++;
            awayStanding.setsLost++;

            homeStanding.totalPointsWon += game.set3Team1 ?? 0;
            homeStanding.totalPointsLost += game.set3Team2 ?? 0;

            awayStanding.totalPointsLost += game.set3Team1 ?? 0;
            awayStanding.totalPointsWon += game.set3Team2 ?? 0;
          } else if ((game.set3Team1 ?? 0) < (game.set3Team2 ?? 0)) {
            homeStanding.setsLost++;
            awayStanding.setsWon++;

            homeStanding.totalPointsWon += game.set3Team1 ?? 0;
            homeStanding.totalPointsLost += game.set3Team2 ?? 0;

            awayStanding.totalPointsLost += game.set3Team1 ?? 0;
            awayStanding.totalPointsWon += game.set3Team2 ?? 0;
          }
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
    draw: DrawCompetition,
    encounters: EncounterCompetition[],
    transaction: Transaction,
  ) {
    const processed = new Set<string>();
    const standings = new Map<string, Standing>();

    for (const encounter of encounters) {
      if (!encounter.homeTeamId || !encounter.awayTeamId) {
        continue;
      }

      const homeTeam = await encounter.getHome({ transaction });
      const awayTeam = await encounter.getAway({ transaction });

      if (!homeTeam || !awayTeam) {
        continue;
      }

      if (homeTeam && !processed.has(homeTeam.id)) {
        const entryTeam1 = new EventEntry({
          subEventId: draw.subeventId,
          entryType: 'competition',
          drawId: draw.id,
          teamId: homeTeam.id,
        });

        const standingTeam1 = new Standing({
          entryId: entryTeam1.id,
        });

        await entryTeam1.save({ transaction });
        await standingTeam1.save({ transaction });

        processed.add(homeTeam.id);

        standings.set(homeTeam.id, standingTeam1);
      }

      if (awayTeam && !processed.has(awayTeam.id)) {
        const entryTeam1 = new EventEntry({
          subEventId: draw.subeventId,
          entryType: 'competition',
          drawId: draw.id,
          teamId: awayTeam.id,
        });

        const standingTeam1 = new Standing({
          entryId: entryTeam1.id,
        });

        await entryTeam1.save({ transaction });
        await standingTeam1.save({ transaction });

        processed.add(awayTeam.id);

        standings.set(awayTeam.id, standingTeam1);
      }
    }

    return standings;
  }

  private async destroyExisting(draw: DrawCompetition, transaction: Transaction) {
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
