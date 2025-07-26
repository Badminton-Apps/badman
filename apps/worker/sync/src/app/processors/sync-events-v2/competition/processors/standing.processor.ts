import {
  DrawCompetition,
  EncounterCompetition,
  EventEntry,
  Standing,
  Team,
} from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { runParallel, sortStanding } from '@badman/utils';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, JobId } from 'bull';
import { Transaction } from 'sequelize';

@Processor({
  name: SyncQueue,
})
export class DrawStandingCompetitionProcessor {
  private readonly logger = new Logger(DrawStandingCompetitionProcessor.name);

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
        // don't do this for now
        deleteStandings?: boolean;
      };
    }>,
  ): Promise<void> {
    this.logger.debug(`Processing draw standing for draw ${job.data.drawId}`);

    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    let draw: DrawCompetition;
    if (job.data.drawId) {
      draw = await DrawCompetition.findOne({
        where: {
          id: job.data.drawId,
        },
        include: [
          {
            model: EncounterCompetition,
            required: false,
          },
        ],
      });
    }

    await this._processEncounters(draw, transaction);


    this.logger.debug(`Finished processing draw standing for draw ${job.data.drawId}`);
  }

  private async _processEncounters(draw: DrawCompetition, transaction: Transaction) {
    if (draw.encounterCompetitions.length === 0) {
      return;
    }

    const teams = await this._getTeams(draw, draw.encounterCompetitions, transaction);
    const standings = await this._getStanding(draw, teams, transaction);

    for (const standing of standings.values()) {
      // Restart the counts.
      standing.restartCount();
    }

    for (const encounter of draw.encounterCompetitions) {
      if (!encounter.homeTeamId || !encounter.awayTeamId) {
        continue;
      }

      const homeTeam = teams.find((t) => t.id === encounter.homeTeamId);
      const awayTeam = teams.find((t) => t.id === encounter.awayTeamId);

      if (!homeTeam || !awayTeam) {
        continue;
      }

      const homeStanding = standings.get(homeTeam.id);
      const awayStanding = standings.get(awayTeam.id);

      // Skip if game isn't played yet
      if ((encounter.homeScore ?? 0) == 0 && (encounter.awayScore ?? 0) == 0) {
        continue;
      }

      if (!homeStanding || !awayStanding) {
        continue;
      }

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

      const encounterGames = await encounter.getGames();
      for (const game of encounterGames ?? []) {
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

    this.logger.debug(`Calculating ${standings.size} standings`);

    if (standings.size) {
      let position = 1;
      const sorted = [...standings.values()]?.sort(sortStanding)?.map((acc) => {
        acc.position = position;
        acc.size = standings.size;

        acc.riser = false;
        acc.faller = false;

        // Calculate if the team is promoted or relegated based on the position and the draw's amount of risers/fallers
        if (position <= (draw.risers ?? 0)) {
          acc.riser = true;
        } else if (position > standings.size - (draw.fallers ?? 0)) {
          acc.faller = true;
        }

        // Finally increment the position
        position++;
        return acc;
      });

      await Standing.bulkCreate(
        sorted?.map((e) => e.toJSON()),
        {
          transaction,
          updateOnDuplicate: [
            'position',
            'size',
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
            'riser',
            'faller',
          ],
        },
      );
    }
  }

  private async _getTeams(
    draw: DrawCompetition,
    encounters: EncounterCompetition[],
    transaction: Transaction,
  ) {
    const teams = new Map<string, Team>();

    await runParallel(
      encounters.map(async (e) => {
        try {
          if (!e.homeTeamId || !e.awayTeamId) {
            return;
          }

          if (!teams.has(e.homeTeamId) && e.homeTeamId) {
            const homeTeam = await e.getHome({
              transaction,
              include: [
                {
                  model: EventEntry,
                  required: false,
                  where: { subEventId: draw.subeventId },
                },
              ],
            });
            teams.set(homeTeam.id, homeTeam);
          }

          if (!teams.has(e.awayTeamId) && e.awayTeamId) {
            const awayTeam = await e.getAway({
              transaction,
              include: [
                {
                  model: EventEntry,
                  required: false,
                  where: { subEventId: draw.subeventId },
                },
              ],
            });
            teams.set(awayTeam.id, awayTeam);
          }
        } catch (error) {
          this.logger.error(`Error fetching teams for encounter ${e.id}`, error);
          throw error;
        }
      }),
    );
    return [...teams.values()];
  }

  private async _getStanding(draw: DrawCompetition, teams: Team[], transaction: Transaction) {
    const teamStandings = new Map<string, Standing>();

    await runParallel(
      teams.map(async (team) => {
        teamStandings.set(team.id, await this._standingTeam(draw, team, transaction));
      }),
    );

    return teamStandings;
  }

  private async _standingTeam(draw: DrawCompetition, team: Team, transaction: Transaction) {
    let entryDraw = team.entry;

    try {
      if (!entryDraw) {
        this.logger.warn(`No entries found`);
        entryDraw = await new EventEntry({
          subEventId: draw.subeventId,
          entryType: 'competition',
          drawId: draw.id,
          teamId: team.id,
          meta: undefined,
        }).save({ transaction });
      }

      entryDraw.entryType = 'competition';
      entryDraw.drawId = draw.id;

      await entryDraw.save({ transaction });
    } catch (error) {
      this.logger.error(`Error fetching entry    for team ${team.id}`, error);
      throw error;
    }

    let teamStanding = await entryDraw?.getStanding({ transaction });

    if (!teamStanding) {
      teamStanding = await new Standing({
        entryId: entryDraw.id,
      }).save({ transaction });
    }

    return teamStanding;
  }
}
