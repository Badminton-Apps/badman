import {
  DrawTournament,
  Standing,
  EventEntry,
  Game,
} from '@badman/backend-database';
import { DrawStepData } from './draw';
import { Op } from 'sequelize';
import { StepProcessor, StepOptions } from '../../../../processing';
import { Logger } from '@nestjs/common';
import { runParrallel } from '@badman/utils';
import { EncounterStepData } from '../../competition-sync/processors';

export interface StandingStepOptions {
  newGames?: boolean;
}

export class TournamentSyncStandingProcessor extends StepProcessor {
  public draws: DrawStepData[];
  public encounters: EncounterStepData[];
  public games: Game[];

  private standingOptions: StandingStepOptions;

  constructor(options?: StepOptions & StandingStepOptions) {
    options.logger =
      options.logger || new Logger(TournamentSyncStandingProcessor.name);
    super(options);

    this.standingOptions = options || {};
  }

  public async process(): Promise<void> {
    await runParrallel(
      this.draws.map((e) => {
        const filtered = this.games.filter((g) => g.linkId === e.draw.id);
        return this._processDraws(e.draw, filtered);
      })
    );
  }

  private async _processDraws(draw: DrawTournament, games: Game[]) {
    if ((games?.length ?? 0) === 0) {
      return;
    }

    const entries = await this._getEntries(games, draw.subeventId);
    const standings = await this._getStanding(draw, games, entries);

    // Only reset if we are running from start
    if (!this.standingOptions.newGames) {
      for (const standing of standings.values()) {
        // Restart the counts.
        standing.restartCount();
      }
    }

    for (const game of games) {
      const playert1p1 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 1 && e.GamePlayerMembership.player == 1
      );

      const playert2p1 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 2 && e.GamePlayerMembership.player == 1
      );

      if (!playert1p1 || !playert2p1) {
        this.logger.error(`Could not find players for game ${game.id}`);
        continue;
      }

      const t1Standing = standings.get(`${playert1p1?.id}_${draw.id}`);
      const t2Standing = standings.get(`${playert2p1?.id}_${draw.id}`);
      const encounter = this.encounters.find(
        (e) => e.encounter.id === game.linkId
      );
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

      if (game.set1Team1 > game.set1Team2) {
        t1Standing.setsWon++;
        t2Standing.setsLost++;

        t1Standing.totalPointsWon += game.set1Team1;
        t1Standing.totalPointsLost += game.set1Team2;

        t2Standing.totalPointsLost += game.set1Team1;
        t2Standing.totalPointsWon += game.set1Team2;
      } else if (game.set1Team1 < game.set1Team2) {
        t1Standing.setsLost++;
        t2Standing.setsWon++;

        t2Standing.totalPointsWon += game.set1Team2;
        t2Standing.totalPointsLost += game.set1Team1;

        t1Standing.totalPointsLost += game.set1Team2;
        t1Standing.totalPointsWon += game.set1Team1;
      }

      if (game.set2Team1 > game.set2Team2) {
        t1Standing.setsWon++;
        t2Standing.setsLost++;

        t1Standing.totalPointsWon += game.set2Team1;
        t1Standing.totalPointsLost += game.set2Team2;

        t2Standing.totalPointsLost += game.set2Team1;
        t2Standing.totalPointsWon += game.set2Team2;
      } else if (game.set2Team1 < game.set2Team2) {
        t1Standing.setsLost++;
        t2Standing.setsWon++;

        t2Standing.totalPointsWon += game.set2Team2;
        t2Standing.totalPointsLost += game.set2Team1;

        t1Standing.totalPointsLost += game.set2Team2;
        t1Standing.totalPointsWon += game.set2Team1;
      }

      if ((game.set3Team1 ?? 0) !== 0 && (game.set3Team2 ?? 0) !== 0) {
        if (game.set3Team1 > game.set3Team2) {
          t1Standing.setsWon++;
          t2Standing.setsLost++;

          t1Standing.totalPointsWon += game.set3Team1;
          t1Standing.totalPointsLost += game.set3Team2;

          t2Standing.totalPointsLost += game.set3Team1;
          t2Standing.totalPointsWon += game.set3Team2;
        } else if (game.set3Team1 < game.set3Team2) {
          t1Standing.setsLost++;
          t2Standing.setsWon++;

          t2Standing.totalPointsWon += game.set3Team2;
          t2Standing.totalPointsLost += game.set3Team1;

          t1Standing.totalPointsLost += game.set3Team2;
          t1Standing.totalPointsWon += game.set3Team1;
        }
      }
    }

    let position = 1;

    if (standings.size > 0) {
      let sorted = [...standings.values()]
        ?.sort(this.sortStandings())
        ?.map((acc) => {
          acc.position = position;
          acc.size = standings.size;

          // Calculate if the team is promoted or relegated based on the position and the draw's amount of risers/fallers
          if (draw.risers > 0 && position <= draw.risers) {
            acc.riser = true;
            acc.faller = false;
          } else if (
            draw.fallers > 0 &&
            standings.size - position < draw.fallers
          ) {
            acc.riser = false;
            acc.faller = true;
          }

          position++;
          return acc;
        });

      sorted = sorted.filter(
        (a, i) => sorted.findIndex((s) => a.id === s.id) === i
      );

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

  private async _getEntries(games: Game[], subEventId: string) {
    const keys = [
      ...new Set(games?.map((g) => g.players?.map((p) => p?.id))?.flat()),
    ];
    return await EventEntry.findAll({
      attributes: [
        'id',
        'drawId',
        'subEventId',
        'meta',
        'player1Id',
        'player2Id',
      ],
      where: {
        subEventId,
        [Op.or]: [
          {
            player1Id: {
              [Op.in]: keys,
            },
          },
          {
            player2Id: {
              [Op.in]: keys,
            },
          },
        ],
      },
      transaction: this.transaction,
    });
  }

  private async _getStanding(
    draw: DrawTournament,
    games: Game[],
    entries: EventEntry[]
  ) {
    const playerStandings = new Map<string, Standing>();
    const setStandingTeam = async (
      entriesSubevent: EventEntry[],
      player1Id: string,
      player2Id: string
    ) => {
      const entriesDraw = entriesSubevent.filter((e) => e.drawId === draw.id);
      let entryDraw: EventEntry;

      if (entriesDraw.length > 0) {
        if (entriesDraw.length === 1) {
          entryDraw = entriesDraw[0];
        } else {
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
          entryDraw = await new EventEntry({
            subEventId: draw.subeventId,
            entryType: 'tournament',
            drawId: draw.id,
            player1Id,
            player2Id,
          }).save({
            transaction: this.transaction,
          });
        } else if (entriesSubevent.length == 1) {
          entryDraw = entriesSubevent[0];

          entryDraw.entryType = 'tournament';
          entryDraw.drawId = draw.id;

          await entryDraw.save({
            transaction: this.transaction,
          });
        } else {
          // We have multiple (usually KO/Playoff) entries for this subEvent
          // As we can't know which one is the right one, we'll just use the first one
          const meta = entriesSubevent.find((e) => e.meta != null)?.meta;

          // Delete all entries for this subEvent (except the one we may have created in previous step = drawId  is filled in)
          for (const entry of entriesSubevent?.filter(
            (e) => e.drawId === null
          ) ?? []) {
            await entry.destroy({ transaction: this.transaction });
          }

          entryDraw = await new EventEntry({
            subEventId: draw.subeventId,
            entryType: 'tournament',
            drawId: draw.id,
            player1Id,
            player2Id,
            meta: meta,
          }).save({
            transaction: this.transaction,
          });
        }
      }

      let teamStanding = await entryDraw?.getStanding({
        transaction: this.transaction,
      });

      if (!teamStanding) {
        teamStanding = await new Standing({
          entryId: entryDraw.id,
        }).save({ transaction: this.transaction });
      }

      playerStandings.set(`${player1Id}_${draw.id}`, teamStanding);
    };

    // must be in for loop, standings can be set in parallel
    for (const game of games) {
      const playert1p1 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 1 && e.GamePlayerMembership.player == 1
      );
      const playert1p2 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 1 && e.GamePlayerMembership.player == 2
      );

      const playert2p1 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 2 && e.GamePlayerMembership.player == 1
      );
      const playert2p2 = game.players?.find(
        (e) =>
          e.GamePlayerMembership.team == 2 && e.GamePlayerMembership.player == 2
      );

      // we run on the first player as this should always be present (partner isn't availible in single)
      if (playert1p1 && !playerStandings.has(`${playert1p1.id}_${draw.id}`)) {
        await setStandingTeam(
          entries.filter(
            (r) =>
              r.subEventId === draw.subeventId &&
              (r.player1Id == playert1p1?.id || r.player1Id == playert1p2?.id)
          ),
          playert1p1?.id,
          playert1p2?.id
        );
      }
      if (playert2p1 && !playerStandings.has(`${playert2p1.id}_${draw.id}`)) {
        await setStandingTeam(
          entries.filter(
            (r) =>
              r.subEventId === draw.subeventId &&
              (r.player1Id == playert2p1?.id || r.player1Id == playert2p2?.id)
          ),
          playert2p1?.id,
          playert2p2?.id
        );
      }
    }

    return playerStandings;
  }
}
