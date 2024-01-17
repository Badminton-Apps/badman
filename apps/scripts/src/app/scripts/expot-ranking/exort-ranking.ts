import {
  Club,
  Game,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { ClubMembershipType, GameBreakdownType, GameType, getGameResultType, runParallel } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Includeable, Op } from 'sequelize';
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
    'Single Upgrade Badman'?: number;
    'Single Downgrade'?: number;
    'Double Ranking': number;
    'Double Upgrade'?: number;
    'Double Upgrade Badman'?: number;
    'Double Downgrade'?: number;
    'Mix ranking': number;
    'Mix Upgrade'?: number;
    'Mix Upgrade Badman'?: number;
    'Mix Downgrade'?: number;
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

  async process(season: number, systemId: string) {
    // create an excel to track all actions
    const debug = false;

    try {
      this.logger.verbose(`Exporting players`);

      const system = await RankingSystem.findOne({
        where: {
          id: systemId,
          // primary: true,
        },
        include: [{ model: RankingGroup }],
      });
      if (!system) {
        throw new Error('No primary ranking system found');
      }

      const players = await this.loadPlayers(season, system, debug);
      const [compGames, tournamentGames] = await this.countGames(system, players);

      const totalPlayers = players.length;
      let processedPlayers = 0;

      await runParallel(
        players?.map(async (player) => {
          const compGamesPlayer = compGames.filter((g) => g.players?.some((p) => p.id == player.id));
          const tournamentGamesPlayer = tournamentGames.filter((g) => g.players?.some((p) => p.id == player.id));

          this.output.push(this.processPlayer(player, compGamesPlayer, tournamentGamesPlayer, system, debug));

          if (processedPlayers % 100 === 0) {
            this.logger.verbose(
              `Processed ${processedPlayers} of ${totalPlayers} (${(processedPlayers / totalPlayers) * 100}%)`,
            );
          }
          processedPlayers++;
        }),
        50,
      );

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(this.output);

      autoSize(ws);
      autoFilter(ws);

      xlsx.utils.book_append_sheet(wb, ws, 'Players');

      xlsx.writeFile(wb, `apps/scripts/src/app/shared-files/${system.name} ${season}.xlsx`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  private processPlayer(
    player: Player,
    compGamesPlayer: Game[],
    tournamentGamesPlayer: Game[],
    system: RankingSystem,
    debug: boolean,
  ) {
    const lastRanking = player.rankingLastPlaces?.[0];

    const singleComp = compGamesPlayer.filter((g) => g.gameType === GameType.S);
    const doubleComp = compGamesPlayer.filter((g) => g.gameType === GameType.D);
    const mixComp = compGamesPlayer.filter((g) => g.gameType === GameType.MX);

    const singleTournament = tournamentGamesPlayer.filter((g) => g.gameType === GameType.S);
    const doubleTournament = tournamentGamesPlayer.filter((g) => g.gameType === GameType.D);
    const mixTournament = tournamentGamesPlayer.filter((g) => g.gameType === GameType.MX);

    const gamesSingle = [...singleComp, ...singleTournament];
    const gamesDouble = [...doubleComp, ...doubleTournament];
    const gamesMix = [...mixComp, ...mixTournament];

    return {
      'First Name': player.firstName,
      'Last Name': player.lastName,
      'Member id': player.memberId,
      Club: player.clubs?.[0]?.name,
      'Single Ranking': lastRanking?.single ?? system.amountOfLevels,

      'Single Upgrade': lastRanking?.singlePoints,
      'Single Upgrade Badman': this.getUpgradeAverage(gamesSingle, player, system),
      'Single Downgrade': debug ? 0 : this.getDowngradeAverage(gamesSingle, player, system),
      'Double Ranking': lastRanking?.double ?? system.amountOfLevels,
      'Double Upgrade': lastRanking?.doublePoints,
      'Double Upgrade Badman': debug ? 0 : this.getUpgradeAverage(gamesDouble, player, system),
      'Double Downgrade': debug ? 0 : this.getDowngradeAverage(gamesDouble, player, system),
      'Mix ranking': lastRanking?.mix ?? system.amountOfLevels,
      'Mix Upgrade': lastRanking?.mixPoints,
      'Mix Upgrade Badman': debug ? 0 : this.getUpgradeAverage(gamesMix, player, system),
      'Mix Downgrade': debug ? 0 : this.getDowngradeAverage(gamesMix, player, system),
      'Single # Competition': singleComp.length,
      'Single # Tournaments': singleTournament.length,
      'Single # Total': singleComp.length + singleTournament.length,
      'Double # Competition': doubleComp.length,
      'Double # Tournament': doubleTournament.length,
      'Double # Total': doubleComp.length + doubleTournament.length,
      'Mix # Competition': mixComp.length,
      'Mix # Tournament': mixTournament.length,
      'Mix # Total': mixComp.length + mixTournament.length,
    };
  }

  async loadPlayers(season: number, system: RankingSystem, debug: boolean) {
    this.logger.verbose(`Loading players`);

    const orClause = [];
    if (debug) {
      orClause.push({
        // always include me for debugging
        slug: ['erika-verhoeven', 'gunther-van-loco', 'glenn-latomme'],
      });
    } else {
      const playersxlsx = xlsx.readFile(`apps/scripts/src/app/shared-files/Players ${season}-${season + 1}.xlsx`);
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

      playersJson = playersJson?.filter((c) => c.memberid != null && c.memberid != '' && c.memberid != undefined);
      // ?.slice(0, 1000);
      orClause.push({ memberId: playersJson?.map((c) => c.memberid) });
    }

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId'],
      where: {
        [Op.or]: orClause,
        competitionPlayer: true,
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
    const stop = moment(); // system.calculationLastUpdate;
    const start = moment(system.calculationLastUpdate).subtract(system.periodAmount, system.periodUnit);

    const sharedInclude = [
      {
        model: Player,
        attributes: ['id'],
        where: {
          id: players.map((p) => p.id),
        },
      },
      {
        model: RankingPoint,
        attributes: ['id', 'points', 'systemId', 'playerId', 'differenceInLevel'],
        where: {
          systemId: system.id,
        },
        required: true,
      },
    ] as Includeable[];

    this.logger.verbose(`Loading games between ${start} and ${stop}`);

    this.logger.verbose(`Loading competition games`);
    const competitionGames = await Game.findAll({
      attributes: ['id', 'gameType', 'winner'],
      where: {
        playedAt: {
          [Op.between]: [start.format('YYYY-MM-DD'), stop.format('YYYY-MM-DD')],
        },
        linkType: 'competition',
      },
      include: [...sharedInclude],
    });

    this.logger.verbose(`Loading tournament games`);
    const tournamentGames = await Game.findAll({
      attributes: ['id', 'gameType', 'winner'],
      where: {
        playedAt: {
          [Op.between]: [start.format('YYYY-MM-DD'), stop.format('YYYY-MM-DD')],
        },
        linkType: 'tournament',
      },
      include: [...sharedInclude],
    });

    return [competitionGames, tournamentGames];
  }

  getDowngradeAverage(games: Game[], player: Player, system?: RankingSystem) {
    let lostGames = 0;
    let points: number[] = [];
    let index = 0;

    for (const game of games) {
      const playerTeam = game.players?.find((r) => r.GamePlayerMembership.playerId === player.id)?.GamePlayerMembership
        .team;
      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == player.id);
      if (!rankingPoint) {
        continue;
      }

      if (!game.gameType) {
        this.logger.warn(`Game ${game.id} has no gameType`);
        continue;
      }

      rankingPoint.system = system;

      const gameResult = getGameResultType(game.winner == playerTeam, game.gameType, rankingPoint);

      if (gameResult == GameBreakdownType.LOST_DOWNGRADE) {
        lostGames++;
      } else if (gameResult == GameBreakdownType.WON) {
        points.push(rankingPoint?.points ?? 0);
      }
    }

    // sort points high to low
    points = points.sort((a, b) => b - a);

    for (let i = 1; i <= points.length; i++) {
      // start from the highest points amount and add one point at a time
      const usedPoints = points.slice(0, i);

      // sum points used for this iteration
      const sum = usedPoints.reduce((a, b) => a + b, 0);

      // Count the games
      let usedGames = lostGames + usedPoints.length;

      // if usedGames is less then 7 use 7
      if (usedGames < (system?.minNumberOfGamesUsedForDowngrade ?? 1)) {
        usedGames = system?.minNumberOfGamesUsedForDowngrade ?? 1;
      }

      const newIndex = sum / usedGames;

      if (newIndex < index) {
        return Math.round(index);
      }

      index = newIndex;
    }

    return Math.round(index);
  }

  getUpgradeAverage(games: Game[], player: Player, system?: RankingSystem) {
    let lostGames = 0;
    let points: number[] = [];
    let index = 0;

    for (const game of games) {
      const playerTeam = game.players?.find((r) => r.GamePlayerMembership.playerId === player.id)?.GamePlayerMembership
        .team;
      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == player.id);
      if (!rankingPoint) {
        continue;
      }

      if (!game.gameType) {
        this.logger.warn(`Game ${game.id} has no gameType`);
        continue;
      }

      rankingPoint.system = system;

      const gameResult = getGameResultType(game.winner == playerTeam, game.gameType, rankingPoint);

      if (gameResult == GameBreakdownType.LOST_UPGRADE || gameResult == GameBreakdownType.LOST_DOWNGRADE) {
        lostGames++;
      } else if (gameResult == GameBreakdownType.WON) {
        points.push(rankingPoint?.points ?? 0);
      }
    }

    // sort points high to low
    points = points.sort((a, b) => b - a);

    for (let i = 1; i <= points.length; i++) {
      // start from the highest points amount and add one point at a time
      const usedPoints = points.slice(0, i);

      // sum points used for this iteration
      const sum = usedPoints.reduce((a, b) => a + b, 0);

      // Count the games
      let usedGames = lostGames + usedPoints.length;

      // if usedGames is less then 7 use 7
      if (usedGames < (system?.minNumberOfGamesUsedForUpgrade ?? 1)) {
        usedGames = system?.minNumberOfGamesUsedForUpgrade ?? 1;
      }

      const newIndex = sum / usedGames;

      if (newIndex < index) {
        return Math.round(index);
      }

      index = newIndex;
    }

    return Math.round(index);
  }
}
