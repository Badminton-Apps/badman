import {
  DrawTournament,
  EventEntry,
  EventTournament,
  Player,
  RankingLastPlace,
  RankingSystem,
  SubEventTournament,
} from '@badman/backend-database';
import { GameType, getSeason, getSeasonPeriod } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import xlsx from 'xlsx';

/**
if a player with a ranking 12 has played in any offical tournament where the subEvent has a min ranking of 9 or lower,
This means the player has a wrong ranking and was probably not calculated correctly by the ranking service.

The goal of this script is to find all these players and write them to a file
*/
@Injectable()
export class PlayersWrongRankingRunner {
  private readonly logger = new Logger(PlayersWrongRankingRunner.name);

  async process() {
    const getPrimaryRanking = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    const playerInclude = [
      {
        model: RankingLastPlace,
        attributes: ['id', 'single', 'double', 'mix'],
        where: {
          systemId: getPrimaryRanking.id,
          single: 12,
          double: 12,
          mix: 12,
        },
      },
    ];

    const seasonPeriod = getSeasonPeriod(getSeason() - 1);

    // start by fetching all offical events and their subevents with a min ranking of 9 or lower of last season
    const events = await EventTournament.findAll({
      attributes: ['id', 'name', 'firstDay'],
      where: {
        firstDay: {
          [Op.between]: [seasonPeriod[0], seasonPeriod[1]],
        },
        official: true,
      },
      include: [
        {
          model: SubEventTournament,
          attributes: ['id', 'name', 'level', 'gameType'],
          where: {
            level: {
              [Op.lt]: 9,
            },
          },
          include: [
            {
              model: DrawTournament,
              attributes: ['id'],
              include: [
                {
                  model: EventEntry,
                  attributes: ['id', 'player1Id', 'player2Id'],
                },
              ],
            },
          ],
        },
      ],
    });

    // get all the players that played in these events

    this.logger.verbose(`Found ${events.length} events`);

    const players: Map<string, Player> = new Map();

    for (const event of events) {
      for (const subEvent of event.subEventTournaments) {
        for (const draw of subEvent.drawTournaments) {
          for (const entry of draw.eventEntries) {
            const entryP = await entry.getPlayers({
              attributes: ['id', 'memberId', 'firstName', 'lastName'],
              include: playerInclude,
            });

            for (const player of entryP) {
              if (!player?.memberId) {
                continue;
              }

              // skip if the player is already added
              if (players.has(player.memberId)) {
                continue;
              }

              let usedLevel = 12;

              switch (subEvent.gameType) {
                case GameType.S:
                  usedLevel = player?.rankingLastPlaces?.[0]?.single;
                  break;
                case GameType.D:
                  usedLevel = player?.rankingLastPlaces?.[0]?.double;
                  break;
                case GameType.MX:
                  usedLevel = player?.rankingLastPlaces?.[0]?.mix;
                  break;
                default:
                  break;
              }

              if (
                // check if the player has a wrong ranking
                usedLevel - 2 >
                subEvent.level
              ) {
                this.logger.verbose(
                  `Player ${player.memberId} has wrong ranking ${usedLevel} in event ${subEvent.level} (${subEvent.name})`,
                );
                players.set(player.memberId, player);
              }
            }
          }
        }
      }
    }

    if (players.size === 0) {
      this.logger.verbose(`No players with wrong ranking found`);
      return;
    }

    this.logger.verbose(`Found ${players.size} players with wrong ranking`);

    // write the players to a file
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(
      Array.from(players.values()).map((player) => ({
        memberId: player.memberId,
        firstName: player.firstName,
        lastName: player.lastName,
      })),
    );

    xlsx.utils.book_append_sheet(wb, ws, 'players');
    xlsx.writeFile(wb, 'players-with-wrong-ranking.xlsx');

    this.logger.verbose(`Done`);
  }
}
