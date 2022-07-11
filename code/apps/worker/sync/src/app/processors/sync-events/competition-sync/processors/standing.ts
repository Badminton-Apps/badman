import {
  DrawCompetition,
  EncounterCompetition,
  EventEntry,
  Game,
  Standing,
  Team,
} from '@badman/api/database';
import { StepProcessor, StepOptions } from '../../../../processing';
import { DrawStepData } from './draw';
import { EncounterStepData } from './encounter';

export interface StandingStepOptions {
  newGames?: boolean;
}
export class CompetitionSyncStandingProcessor extends StepProcessor {
  public draws: DrawStepData[];
  public encounters: EncounterStepData[];
  public games: Game[];

  private standingOptions: StandingStepOptions;

  constructor(options?: StepOptions & StandingStepOptions) {
    super(options);

    this.standingOptions = options || {};
  }

  public async process(): Promise<void> {
    // for (const e of this.draws) {
    //   const filtered = this.encounters
    //     .filter((g) => g.encounter.drawId === e.draw.id)
    //     ?.map((r) => r.encounter);
    //   await this._processEncounters(e.draw, filtered);
    // }

    await Promise.all(
      this.draws.map((e) => {
        const filtered = this.encounters
          .filter((g) => g.encounter.drawId === e.draw.id)
          ?.map((r) => r.encounter);
        return this._processEncounters(e.draw, filtered);
      })
    );
  }

  private async _processEncounters(
    draw: DrawCompetition,
    encounters: EncounterCompetition[]
  ) {
    if (encounters.length === 0) {
      return;
    }

    const teams = await this._getTeams(draw, encounters);
    const standings = await this._getStanding(draw, teams);

    // Only reset if we are running from start
    if (!this.standingOptions.newGames) {
      for (const standing of standings.values()) {
        // Restart the counts.
        standing.restartCount();
      }
    }

    for (const encounter of encounters) {
      if (!encounter.homeTeamId || !encounter.awayTeamId) {
        continue;
      }

      const homeTeam = teams.find((t) => t.id === encounter.homeTeamId);
      const awayTeam = teams.find((t) => t.id === encounter.awayTeamId);

      const homeStanding = standings.get(homeTeam.id);
      const awayStanding = standings.get(awayTeam.id);

      // Skip if game isn't played yet
      if ((encounter.homeScore ?? 0) == 0 && (encounter.awayScore ?? 0) == 0) {
        continue;
      }

      // We played 1 encounter
      homeStanding.played++;
      awayStanding.played++;

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

      const encoutnerGames = this.games.filter(
        (g) => g.linkId === encounter.id
      );

      for (const game of encoutnerGames ?? []) {
        if (game.winner == 1) {
          homeStanding.gamesWon++;
          awayStanding.gamesLost++;
        } else {
          awayStanding.gamesWon++;
          homeStanding.gamesLost++;
        }

        if (game.set1Team1 > game.set1Team2) {
          homeStanding.setsWon++;
          awayStanding.setsLost++;

          homeStanding.totalPointsWon += game.set1Team1;
          homeStanding.totalPointsLost += game.set1Team2;

          awayStanding.totalPointsLost += game.set1Team1;
          awayStanding.totalPointsWon += game.set1Team2;
        } else if (game.set1Team1 < game.set1Team2) {
          homeStanding.setsLost++;
          awayStanding.setsWon++;

          homeStanding.totalPointsWon += game.set1Team1;
          homeStanding.totalPointsLost += game.set1Team2;

          awayStanding.totalPointsLost += game.set1Team1;
          awayStanding.totalPointsWon += game.set1Team2;
        }

        if (game.set2Team1 > game.set2Team2) {
          homeStanding.setsWon++;
          awayStanding.setsLost++;

          homeStanding.totalPointsWon += game.set2Team1;
          homeStanding.totalPointsLost += game.set2Team2;

          awayStanding.totalPointsLost += game.set2Team1;
          awayStanding.totalPointsWon += game.set2Team2;
        } else if (game.set2Team1 < game.set2Team2) {
          homeStanding.setsLost++;
          awayStanding.setsWon++;

          homeStanding.totalPointsWon += game.set2Team1;
          homeStanding.totalPointsLost += game.set2Team2;

          awayStanding.totalPointsLost += game.set2Team1;
          awayStanding.totalPointsWon += game.set2Team2;
        }

        if ((game.set3Team1 ?? 0) !== 0 && (game.set3Team2 ?? 0) !== 0) {
          if (game.set3Team1 > game.set3Team2) {
            homeStanding.setsWon++;
            awayStanding.setsLost++;

            homeStanding.totalPointsWon += game.set3Team1;
            homeStanding.totalPointsLost += game.set3Team2;

            awayStanding.totalPointsLost += game.set3Team1;
            awayStanding.totalPointsWon += game.set3Team2;
          } else if (game.set3Team1 < game.set3Team2) {
            homeStanding.setsLost++;
            awayStanding.setsWon++;

            homeStanding.totalPointsWon += game.set3Team1;
            homeStanding.totalPointsLost += game.set3Team2;

            awayStanding.totalPointsLost += game.set3Team1;
            awayStanding.totalPointsWon += game.set3Team2;
          }
        }
      }
    }

    let position = 1;
    const sorted = [...standings.values()]
      ?.sort((a, b) => {
        if (a.points > b.points) {
          return -1;
        } else if (a.points < b.points) {
          return 1;
        }

        if (a.won > b.won) {
          return -1;
        } else if (a.won < b.won) {
          return 1;
        }

        if (a.won - a.lost > b.won - b.lost) {
          return -1;
        } else if (a.won - a.lost < b.won - b.lost) {
          return 1;
        }

        if (a.gamesWon - a.gamesLost > b.gamesWon - b.gamesLost) {
          return -1;
        } else if (a.gamesWon - a.gamesLost < b.gamesWon - b.gamesLost) {
          return 1;
        }

        if (a.setsWon - a.setsLost > b.setsWon - b.setsLost) {
          return -1;
        } else if (a.setsWon - a.setsLost < b.setsWon - b.setsLost) {
          return 1;
        }

        if (
          a.totalPointsWon - a.totalPointsLost >
          b.totalPointsWon - b.totalPointsLost
        ) {
          return -1;
        } else if (
          a.totalPointsWon - a.totalPointsLost <
          b.totalPointsWon - b.totalPointsLost
        ) {
          return 1;
        }

        return 0;
      })
      ?.map((acc) => {
        acc.position = position;
        position++;
        return acc;
      });

    await Standing.bulkCreate(
      sorted?.map((e) => e.toJSON()),
      {
        transaction: this.transaction,
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
      }
    );
  }

  private async _getTeams(
    draw: DrawCompetition,
    encounters: EncounterCompetition[]
  ) {
    const teams = new Map<string, Team>();

    await Promise.all(
      encounters.map(async (e) => {
        try {
          if (!teams.has(e.homeTeamId) && e.homeTeamId) {
            const homeTeam = await e.getHome({
              transaction: this.transaction,
              include: [
                {
                  model: EventEntry,
                  as: 'entries',
                  required: false,
                  where: { subEventId: draw.subeventId },
                },
              ],
            });
            teams.set(homeTeam.id, homeTeam);
          }

          if (!teams.has(e.awayTeamId) && e.awayTeamId) {
            const awayTeam = await e.getAway({
              transaction: this.transaction,
              include: [
                {
                  model: EventEntry,
                  as: 'entries',
                  required: false,
                  where: { subEventId: draw.subeventId },
                },
              ],
            });
            teams.set(awayTeam.id, awayTeam);
          }
        } catch (error) {
          this.logger.error(
            `Error fetching teams for encounter ${e.id}`,
            error
          );
          throw error;
        }
      })
    );
    return [...teams.values()];
  }

  private async _getStanding(draw: DrawCompetition, teams: Team[]) {
    const teamStandings = new Map<string, Standing>();

    // for (const team of teams) {
    //   teamStandings.set(team.id, await this._standingTeam(draw, team));
    // }

    await Promise.all(
      teams.map(async (team) => {
        teamStandings.set(team.id, await this._standingTeam(draw, team));
      })
    );

    return teamStandings;
  }

  private async _standingTeam(draw: DrawCompetition, team: Team) {
    const entriesSubevent = team.entries.filter(
      (e) => e.subEventId === draw.subeventId
    );
    const entriesDraw = entriesSubevent.filter((e) => e.drawId === draw.id);
    let entryDraw: EventEntry;

    try {
      if (entriesDraw.length > 0) {
        if (entriesDraw.length === 1) {
          entryDraw = entriesDraw[0];
        } else {
          this.logger.warn(
            `Found ${entriesDraw.length} entries for team ${team.id} in draw ${draw.id}, destroing others`
          );
          // Use first
          entryDraw = entriesDraw[0];

          // Destroy other entries
          for (const entry of entriesDraw
            .filter((d) => d.drawId === null)
            .slice(1)) {
            await entry.destroy({ transaction: this.transaction });
          }
        }
      } else {
        // We didn't have any entries for this subEvent
        if (entriesSubevent.length == 0) {
          this.logger.warn(
            `Found no entries for team ${team.id} in subEvent ${draw.subeventId}, which means no meta data`
          );
          entryDraw = await new EventEntry({
            subEventId: draw.subeventId,
            drawId: draw.id,
            entryType: 'competition',
            teamId: team.id,
          }).save({
            transaction: this.transaction,
          });
        } else if (entriesSubevent.length == 1) {
          // We only have one subevent. Lets use that :)
          entryDraw = entriesSubevent[0];

          entryDraw.entryType = 'competition';
          entryDraw.drawId = draw.id;

          await entryDraw.save({
            transaction: this.transaction,
          });
        } else {
          // We have multiple (usually KO/Playoff) entries for this subEvent
          // As we can't know which one is the right one, we'll just use the first one
          const meta = entriesSubevent.find(
            (e) => e.meta?.competition != null
          )?.meta;

          // Delete all entries for this subEvent (except the one we may have created in previous step = drawId  is filled in)
          for (const entry of entriesSubevent?.filter(
            (e) => e.drawId === null
          ) ?? []) {
            await entry.destroy({ transaction: this.transaction });
          }

          entryDraw = await new EventEntry({
            subEventId: draw.subeventId,
            entryType: 'competition',
            drawId: draw.id,
            teamId: team.id,
            meta: meta,
          }).save({
            transaction: this.transaction,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching entry    for team ${team.id}`, error);
      throw error;
    }

    let teamStanding = await entryDraw?.getStanding({
      transaction: this.transaction,
    });

    if (!teamStanding) {
      teamStanding = await new Standing({
        entryId: entryDraw.id,
      }).save({ transaction: this.transaction });
    }

    return teamStanding;
  }
}
