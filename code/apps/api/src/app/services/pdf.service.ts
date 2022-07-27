/* eslint-disable prefer-rest-params */
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  Player,
  RankingLastPlace,
  RankingPlace,
  SubEventCompetition,
  SubEventType,
  Team
} from '@badman/api/database';
import { HandlebarService } from '@badman/handlebar';
import { Injectable } from '@nestjs/common';
import {
  promises
} from 'fs';
import moment from 'moment';
import { Op } from 'sequelize';
const { readFile } = promises;

@Injectable()
export class PdfService {
  constructor(private handlebarService: HandlebarService) {

  }

  async getTeamAssemblyPdf(input: {
    systemId: string;
    captainId: string;
    teamId: string;
    encounterId: string;
    team: {
      single: string[];
      double: string[][];
      subtitude: string[];
    };
  }) {
    const idPlayers = [
      ...(input.team?.single ?? []),
      ...(input.team?.double.flat(1) ?? []),
    ];
    const idSubs = input.team?.subtitude;

    const encounter = await EncounterCompetition.findByPk(input.encounterId, {
      include: [
        { model: Team, as: 'home' },
        { model: Team, as: 'away' },
        {
          model: DrawCompetition,
          include: [
            {
              model: SubEventCompetition,
              include: [{ model: EventCompetition }],
            },
          ],
        },
      ],
    });
    const type = encounter.home.type;

    const membership = await EventEntry.findOne({
      where: {
        teamId: input.teamId,
        subEventId: encounter?.drawCompetition?.subEventCompetition?.id,
      },
    });

    const meta = membership?.meta;
    const year =
      encounter.drawCompetition.subEventCompetition.eventCompetition.startYear;

    const usedRankingDate = moment();
    usedRankingDate.set('year', year);
    usedRankingDate.set(
      encounter.drawCompetition.subEventCompetition.eventCompetition
        .usedRankingUnit,
      encounter.drawCompetition.subEventCompetition.eventCompetition
        .usedRankingAmount
    );

    const startRanking = usedRankingDate.clone().set('date', 0);
    const endRanking = usedRankingDate.clone().clone().endOf('month');

    const players = await Player.findAll({
      where: {
        id: {
          [Op.in]: idPlayers,
        },
      },
      include: [
        {
          model: RankingLastPlace,
          where: {
            systemId: input.systemId,
          },
        },
        {
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: {
              [Op.between]: [startRanking.toDate(), endRanking.toDate()],
            },
            systemId: input.systemId,
          },
        },
      ],
    });

    const subs = await Player.findAll({
      where: {
        id: {
          [Op.in]: idSubs,
        },
      },
      include: [
        {
          model: RankingLastPlace,
          where: {
            systemId: input.systemId,
          },
        },
        {
          model: RankingPlace,
          limit: 1,
          where: {
            rankingDate: {
              [Op.between]: [startRanking.toDate(), endRanking.toDate()],
            },
            systemId: input.systemId,
          },
        },
      ],
    });

    const captain = await Player.findByPk(input.captainId);

    const teamIndex = this._teamIndex(players, type);
    const preppedMap = new Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        RankingLastPlace: RankingLastPlace;
        sum: number;
        highest: number;
      }
    >();

    players.concat(subs).forEach((player) => {
      const mayIndex = player.rankingPlaces[0] ?? {
        single: 12,
        double: 12,
        mix: 12,
      };

      preppedMap.set(player.id, {
        ...player.toJSON(),
        RankingLastPlace: player.rankingLastPlaces?.[0].toJSON(),
        base: !!meta?.competition?.players?.find((p) => p?.id === player.id)
          ?.id,
        team: !!teamIndex.players.find((p) => p?.id === player.id),
        sum:
          mayIndex.single +
          mayIndex.double +
          (type === 'MX' ? mayIndex.mix : 0),
        highest: Math.min(
          mayIndex.single,
          mayIndex.double,
          type === 'MX' ? mayIndex.mix : 12
        ),
      });
    });

    const based: string[] = [];
    const teamed: string[] = [];

    const doubles = [
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[0]?.[0],
        input.team.double?.[0]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[1]?.[0],
        input.team.double?.[1]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[2]?.[0],
        input.team.double?.[2]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        teamed,
        input.team.double?.[3]?.[0],
        input.team.double?.[3]?.[1]
      ),
    ];

    const singles = [
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[0])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[1])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[2])
        .player1,
      this._addPlayer(preppedMap, based, teamed, input.team.single?.[3])
        .player1,
    ];

    const subtitudes = input.team.subtitude.map(
      (r) => this._addPlayer(preppedMap, based, teamed, r)?.player1
    );

    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64',
    });
    const context = {
      date: moment(encounter.date).format('DD-MM-YYYY HH:mm'),
      baseIndex: meta?.competition?.teamIndex,
      teamIndex: teamIndex.index,
      homeTeam: encounter.home.name,
      awayTeam: encounter.away.name,
      captain: captain?.fullName,
      doubles,
      singles,
      subtitudes,
      type,
      event: `${type === 'M' ? 'Heren' : type === 'F' ? 'Dames' : 'Gemengd'} ${
        encounter.drawCompetition.name
      }`,
      isHomeTeam: encounter.homeTeamId === input.teamId,
      logo: `data:image/png;base64, ${logo}`,
    };

    return await this.handlebarService.getHtml('pdf/assembly', context, 'assembly');
  }

  private _addPlayer(
    preppedMap: Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        RankingLastPlace: RankingLastPlace;
        sum: number;
        highest: number;
      }
    >,
    based: string[],
    teamed: string[],
    player1Id = '',
    player2Id = ''
  ) {
    const player1 = { ...preppedMap.get(player1Id) };
    const player2 = { ...preppedMap.get(player2Id) };

    if (player1) {
      if (player1.base && based.indexOf(player1.id) === -1) {
        based.push(player1.id);
      } else {
        player1.base = false;
      }

      if (player1.team && teamed.indexOf(player1.id) === -1) {
        teamed.push(player1.id);
      } else {
        player1.team = false;
      }
    }

    if (player2) {
      if (player2.base && based.indexOf(player2.id) === -1) {
        based.push(player2.id);
      } else {
        player2.base = false;
      }

      if (player2.team && teamed.indexOf(player2.id) === -1) {
        teamed.push(player2.id);
      } else {
        player2.team = false;
      }
    }
    return {
      player1,
      player2,
    };
  }

  private _teamIndex(players: Player[], type: SubEventType) {
    const bestPlayers = this._bestPlayers(players, type);

    if (type !== 'MX') {
      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      return {
        players: bestPlayers,
        index: bestPlayers.reduce(
          (a, b) =>
            a +
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12),
          missingIndex
        ),
      };
    } else {
      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 36;
      }

      return {
        players: bestPlayers,
        index: bestPlayers.reduce(
          (a, b) =>
            a +
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12) +
            (b.rankingPlaces[0]?.mix ?? 12),
          missingIndex
        ),
      };
    }
  }

  private _bestPlayers(players: Player[], type: SubEventType) {
    let bestPlayers = [];
    if (type === SubEventType.MX) {
      bestPlayers = [
        ...players
          .filter((p) => p.gender === 'M')
          .sort(
            (b, a) =>
              (b.rankingPlaces[0]?.single ?? 12) +
              (b.rankingPlaces[0]?.double ?? 12) +
              (b.rankingPlaces[0]?.mix ?? 12) -
              ((a.rankingPlaces[0]?.single ?? 12) +
                (a.rankingPlaces[0]?.double ?? 12) +
                (a.rankingPlaces[0]?.mix ?? 12))
          )
          .slice(0, 2),
        ...players
          .filter((p) => p.gender === 'F')
          .sort(
            (b, a) =>
              (b.rankingPlaces[0]?.single ?? 12) +
              (b.rankingPlaces[0]?.double ?? 12) +
              (b.rankingPlaces[0]?.mix ?? 12) -
              ((a.rankingPlaces[0]?.single ?? 12) +
                (a.rankingPlaces[0]?.double ?? 12) +
                (a.rankingPlaces[0]?.mix ?? 12))
          )
          .slice(0, 2),
      ];
    } else {
      bestPlayers = players
        .sort(
          (b, a) =>
            (b.rankingPlaces[0]?.single ?? 12) +
            (b.rankingPlaces[0]?.double ?? 12) -
            ((a.rankingPlaces[0]?.single ?? 12) +
              (a.rankingPlaces[0]?.double ?? 12))
        )
        .slice(0, 4);
    }

    return bestPlayers;
  }
}
