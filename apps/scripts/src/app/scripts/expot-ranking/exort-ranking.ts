import {
  Club,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingPoint,
  RankingSystem,
  SubEventCompetition,
  SubEventTournament,
} from '@badman/backend-database';
import {
  ClubMembershipType,
  GameBreakdownType,
  GameType,
  getGameResultType,
} from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import xlsx from 'xlsx';
import { autoFilter, autoSize } from '../../../shared/excel';

@Injectable()
export class ExportBBFPlayers {
  output: {
    'First Name'?: string;
    'Last Name'?: string;
    'Member id'?: string;
    Club?: string;
    'Single Ranking': number;
    'Single Upgrade'?: number;
    'Single Downgrade'?: number;
    'Double Ranking': number;
    'Double upgrade'?: number;
    'Double downgrade'?: number;
    'Mix ranking': number;
    'Mix upgrade'?: number;
    'Mix downgrade'?: number;
    'Single # Competition': number;
    'Single # Tournaments': number;
    'Single # Total': number;
    'Double # Competition': number;
    'Double # Tournament': number;
    'Double # Total': number;
    'Mix # Competition': number;
    'Mix # Tournament': number;
    'Mix # Total': number;
  }[] = [];

  private readonly logger = new Logger(ExportBBFPlayers.name);
  constructor(private _sequelize: Sequelize) {
    this.logger.log('ExportBBFPlayers');
  }

  async process(season: number) {
    // create an excel to track all actions

    try {
      this.logger.verbose(`Exporting players`);

      const system = await RankingSystem.findOne({
        where: {
          primary: true,
        },
        include: [{ model: RankingGroup }],
      });
      if (!system) {
        throw new Error('No primary ranking system found');
      }

      const players = await this.loadPlayers(season, system);
      const [compGames, tournamentGames] = await this.countGames(
        system,
        players
      );

      for (const player of players) {
        const lastRanking = player.rankingLastPlaces?.[0];
        const compGamesPlayer = compGames.filter((g) =>
          g.players?.some((p) => p.id == player.id)
        );
        const tournamentGamesPlayer = tournamentGames.filter((g) =>
          g.players?.some((p) => p.id == player.id)
        );

        const singleComp = compGamesPlayer.filter(
          (g) => g.gameType === GameType.S
        );
        const doubleComp = compGamesPlayer.filter(
          (g) => g.gameType === GameType.D
        );
        const mixComp = compGamesPlayer.filter(
          (g) => g.gameType === GameType.MX
        );

        const singleTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.S
        );
        const doubleTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.D
        );
        const mixTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.MX
        );

        this.output.push({
          'First Name': player.firstName,
          'Last Name': player.lastName,
          'Member id': player.memberId,
          Club: player.clubs?.[0]?.name,
          'Single Ranking': lastRanking?.single ?? system.amountOfLevels,
          'Single Downgrade': this.getDowngradeAverage(
            [...singleComp, ...singleTournament],
            player
          ),
          'Single Upgrade': lastRanking?.singlePoints,
          'Double Ranking': lastRanking?.double ?? system.amountOfLevels,
          'Double upgrade': lastRanking?.doublePoints,
          'Double downgrade': this.getDowngradeAverage(
            [...doubleComp, ...doubleTournament],
            player
          ),
          'Mix ranking': lastRanking?.mix ?? system.amountOfLevels,
          'Mix upgrade': lastRanking?.mixPoints,
          'Mix downgrade': this.getDowngradeAverage(
            [...mixComp, ...mixTournament],
            player
          ),
          'Single # Competition': singleComp.length,
          'Single # Tournaments': singleTournament.length,
          'Single # Total': singleComp.length + singleTournament.length,
          'Double # Competition': doubleComp.length,
          'Double # Tournament': doubleTournament.length,
          'Double # Total': doubleComp.length + doubleTournament.length,
          'Mix # Competition': mixComp.length,
          'Mix # Tournament': mixTournament.length,
          'Mix # Total': mixComp.length + mixTournament.length,
        });
      }

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(this.output);

      autoSize(ws);
      autoFilter(ws);

      xlsx.utils.book_append_sheet(wb, ws, 'Players');

      xlsx.writeFile(
        wb,
        `apps/scripts/src/app/shared-files/BBF Ranking ${season}.xlsx`
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  async loadPlayers(season: number, system: RankingSystem) {
    this.logger.verbose(`Loading players`);
    const playersxlsx = xlsx.readFile(
      `apps/scripts/src/app/shared-files/Players ${season}-${season + 1}.xlsx`
    );
    const playersSheet = playersxlsx.Sheets[playersxlsx.SheetNames[0]];
    let playersJson = xlsx.utils.sheet_to_json<{
      groupname: string;
      memberid: string;
      lastname: string;
      firstname: string;
      TypeName: string;
      PlayerLevelSingle: string;
      PlayerLevelDouble: string;
      PlayerLevelMixed: string;
    }>(playersSheet);

    playersJson = playersJson?.filter(
      (c) =>
        c.memberid != null &&
        c.memberid != '' &&
        c.memberid != undefined
    ); // ?.slice(0, 10)

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId'],
      where: {
        [Op.or]: [
          { memberId: playersJson?.map((c) => c.memberid) },
          // {
          //   // always include me for debugging
          //   slug: ['glenn-latomme', 'ruben-windey', 'jeroen-casier'],
          // },
        ],
      },
      include: [
        {
          model: Club,
          attributes: ['id', 'name'],
          through: {
            where: {
              end: null,
              membershipType: ClubMembershipType.NORMAL,
            },
          },
        },
        {
          model: RankingLastPlace,
          attributes: [
            'singlePoints',
            'mixPoints',
            'doublePoints',
            'singlePointsDowngrade',
            'mixPointsDowngrade',
            'doublePointsDowngrade',
            'single',
            'mix',
            'double',
          ],
          where: {
            systemId: system.id,
          },
        },
      ],
    });

    return players;
  }

  async countGames(system: RankingSystem, players: Player[]) {
    const stop = system.updateIntervalAmountLastUpdate;
    const start = moment(stop)
      .subtract(system.periodAmount, system.periodUnit)
      .toDate();
    const validSubEventsComp = [];
    const validSubEventsTournament = [];

    for (const group of system.rankingGroups ?? []) {
      validSubEventsComp.push(...(await group.getSubEventCompetitions()));
      validSubEventsTournament.push(...(await group.getSubEventTournaments()));
    }

    const sharedInclude = [
      {
        model: Player,
        where: {
          id: players.map((p) => p.id),
        },
      },
      {
        model: RankingPoint,
      },
    ];

    const competitionGames = await Game.findAll({
      attributes: ['id', 'gameType', 'winner'],
      where: {
        playedAt: {
          [Op.between]: [start, stop],
        },
        linkType: 'competition',
      },
      include: [
        ...sharedInclude,
        {
          model: EncounterCompetition,
          attributes: ['id'],
          required: true,
          include: [
            {
              model: DrawCompetition,
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: SubEventCompetition,
                  attributes: ['id'],
                  required: true,
                  where: {
                    id: validSubEventsComp.map((s) => s.id),
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const tournamentGames = await Game.findAll({
      attributes: ['id', 'gameType', 'winner'],
      where: {
        playedAt: {
          [Op.between]: [start, stop],
        },
        linkType: 'tournament',
      },
      include: [
        ...sharedInclude,
        {
          model: DrawTournament,
          attributes: ['id'],
          required: true,
          include: [
            {
              model: SubEventTournament,
              attributes: ['id'],
              required: true,
              where: {
                id: validSubEventsTournament.map((s) => s.id),
              },
            },
          ],
        },
      ],
    });

    return [competitionGames, tournamentGames];
  }

  getDowngradeAverage(games: Game[], player: Player, system?: RankingSystem) {
    let lostGames = 0;
    let points: number[] = [];
    let index = 0;

    for (const game of games) {
      const playerTeam = game.players?.find(
        (r) => r.GamePlayerMembership.playerId === player.id
      )?.GamePlayerMembership.team;
      const rankingPoint = game.rankingPoints?.find(
        (x) => x.playerId == player.id
      );
      if (!rankingPoint) {
        continue;
      }

      rankingPoint.system = system;

      const gameResult = getGameResultType(
        game.winner == playerTeam,
        rankingPoint
      );

      if (gameResult == GameBreakdownType.LOST_DOWNGRADE) {
        lostGames++;
      } else if (gameResult == GameBreakdownType.WON) {
        points.push(rankingPoint?.points ?? 0);
      }
    }

    // sort points high to low
    points = points.sort((a, b) => b - a);

    for (let i = 1; i < points.length; i++) {
      // start from the highest points amount and add one point at a time
      const usedPoints = points.slice(0, i);

      // sum points used for this iteration
      const sum = usedPoints.reduce((a, b) => a + b, 0);

      // Count the games
      let usedGames = lostGames + usedPoints.length;

      // if usedGames is less then 7 use 7
      if (usedGames < 7) {
        usedGames = 7;
      }

      const newIndex = sum / usedGames;

      if (newIndex < index) {
        return Math.ceil(index);
      }

      index = newIndex;
    }

    return Math.ceil(index);
  }
}
