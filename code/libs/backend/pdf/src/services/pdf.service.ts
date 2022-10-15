/* eslint-disable prefer-rest-params */
import {
  EncounterCompetition,
  EventEntry,
  Player,
  RankingLastPlace,
  RankingPlace,
  SubEventType,
} from '@badman/backend/database';
import { HandlebarService } from '@badman/backend/handlebar';
import { Injectable, Logger } from '@nestjs/common';
import { promises } from 'fs';
import moment from 'moment-timezone';
import { Op } from 'sequelize';
const { readFile } = promises;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  constructor(private handlebarService: HandlebarService) {}

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

    const encounter = await EncounterCompetition.findByPk(input.encounterId);
    const homeTeam = await encounter.getHome({
      attributes: ['id', 'name', 'type'],
    });

    const awayTeam = await encounter.getAway({
      attributes: ['id', 'name'],
    });

    const draw = await encounter.getDrawCompetition({
      attributes: ['id', 'name', 'subeventId'],
    });

    const subEvent = await draw.getSubEventCompetition({
      attributes: ['id', 'eventId'],
    });
    const event = await subEvent.getEventCompetition({
      attributes: ['id', 'usedRankingUnit', 'usedRankingAmount', 'startYear'],
    });

    const type = homeTeam.type;

    const membership = await EventEntry.findOne({
      where: {
        teamId: input.teamId,
        subEventId: subEvent.id,
      },
    });

    const meta = membership?.meta;
    const year = event.startYear;

    const usedRankingDate = moment();
    usedRankingDate.set('year', year);
    usedRankingDate.set(event.usedRankingUnit, event.usedRankingAmount);

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
          required: false,
          model: RankingLastPlace,
          where: {
            systemId: input.systemId,
          },
        },
        {
          required: false,
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
          required: false,
          model: RankingLastPlace,
          where: {
            systemId: input.systemId,
          },
        },
        {
          required: false,
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
        rankingLastPlace: RankingLastPlace;
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
        rankingLastPlace: player.rankingLastPlaces?.[0]?.toJSON(),
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
    const titularis: string[] = [];

    const doubles = [
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.team.double?.[0]?.[0],
        input.team.double?.[0]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.team.double?.[1]?.[0],
        input.team.double?.[1]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.team.double?.[2]?.[0],
        input.team.double?.[2]?.[1]
      ),
      this._addPlayer(
        preppedMap,
        based,
        titularis,
        input.team.double?.[3]?.[0],
        input.team.double?.[3]?.[1]
      ),
    ];

    const singles = [
      this._addPlayer(preppedMap, based, titularis, input.team.single?.[0])
        .player1,
      this._addPlayer(preppedMap, based, titularis, input.team.single?.[1])
        .player1,
      this._addPlayer(preppedMap, based, titularis, input.team.single?.[2])
        .player1,
      this._addPlayer(preppedMap, based, titularis, input.team.single?.[3])
        .player1,
    ];

    const subtitudes = input.team.subtitude.map(
      (r) => this._addPlayer(preppedMap, based, titularis, r)?.player1
    );

    const logo = await readFile(`${__dirname}/assets/logo.png`, {
      encoding: 'base64',
    });

    const date = moment(encounter.date)
      .tz('Europe/Brussels')
      .format('DD-MM-YYYY HH:mm');

    this.logger.debug(
      `Generating assembly for ${homeTeam.name} vs ${awayTeam.name} on ${date}`
    );

    const context = {
      date,
      baseIndex: meta?.competition?.teamIndex,
      teamIndex: teamIndex.index,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      captain: captain?.fullName,
      doubles,
      singles,
      subtitudes,
      type,
      event: `${type === 'M' ? 'Heren' : type === 'F' ? 'Dames' : 'Gemengd'} ${
        draw.name
      }`,
      isHomeTeam: homeTeam.id === input.teamId,
      logo: `data:image/png;base64, ${logo}`,
    };

    return await this.handlebarService.getHtml(
      'pdf/assembly',
      context,
      'assembly'
    );
  }

  private _addPlayer(
    preppedMap: Map<
      string,
      Partial<Player> & {
        base: boolean;
        team: boolean;
        rankingLastPlace: RankingLastPlace;
        sum: number;
        highest: number;
      }
    >,
    based: string[],
    titularis: string[],
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

      if (player1.team && titularis.indexOf(player1.id) === -1) {
        titularis.push(player1.id);
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

      if (player2.team && titularis.indexOf(player2.id) === -1) {
        titularis.push(player2.id);
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
