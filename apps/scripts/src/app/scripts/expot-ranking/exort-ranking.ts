import {
  Club,
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventTournament,
} from '@badman/backend-database';
import {
  ClubMembershipType,
  GameType,
  getCurrentSeasonPeriod,
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
    // 'Single Downgrade'?: number;
    'Double Ranking': number;
    'Double upgrade'?: number;
    // 'Double downgrade'?: number;
    'Mix ranking': number;
    'Mix upgrade'?: number;
    // 'Mix downgrade'?: number;
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
        ).length;
        const doubleComp = compGamesPlayer.filter(
          (g) => g.gameType === GameType.D
        ).length;
        const mixComp = compGamesPlayer.filter(
          (g) => g.gameType === GameType.MX
        ).length;

        const singleTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.S
        ).length;
        const doubleTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.D
        ).length;
        const mixTournament = tournamentGamesPlayer.filter(
          (g) => g.gameType === GameType.MX
        ).length;

        this.output.push({
          'First Name': player.firstName,
          'Last Name': player.lastName,
          'Member id': player.memberId,
          Club: player.clubs?.[0]?.name,
          'Single Ranking': lastRanking?.single ?? system.amountOfLevels,
          // 'Single Downgrade': lastRanking?.singlePointsDowngrade,
          'Single Upgrade': lastRanking?.singlePoints,
          'Double Ranking': lastRanking?.double ?? system.amountOfLevels,
          'Double upgrade': lastRanking?.doublePoints,
          // 'Double downgrade': lastRanking?.doublePointsDowngrade,
          'Mix ranking': lastRanking?.mix ?? system.amountOfLevels,
          'Mix upgrade': lastRanking?.mixPoints,
          // 'Mix downgrade': lastRanking?.mixPointsDowngrade,
          'Single # Competition': singleComp,
          'Single # Tournaments': singleTournament,
          'Single # Total': singleComp + singleTournament,
          'Double # Competition': doubleComp,
          'Double # Tournament': doubleTournament,
          'Double # Total': doubleComp + doubleTournament,
          'Mix # Competition': mixComp,
          'Mix # Tournament': mixTournament,
          'Mix # Total': mixComp + mixTournament,
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

  async loadPlayers(season: number, system: RankingSystem, onlyComp = true) {
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
        c.memberid != undefined &&
        (onlyComp ? c.TypeName == 'Competitiespeler' : true)
    );

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId'],
      where: {
        [Op.or]: [
          { memberId: playersJson?.map((c) => c.memberid) },
          {
            // always include me for debugging
            slug: 'glenn-latomme',
          },
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

    const competitionGames = await Game.findAll({
      attributes: ['id', 'gameType'],
      where: {
        playedAt: {
          [Op.between]: [start, stop],
        },
        linkType: 'competition',
      },
      include: [
        {
          model: Player,
          where: {
            id: players.map((p) => p.id),
          },
        },
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
      attributes: ['id', 'gameType'],
      where: {
        playedAt: {
          [Op.between]: [start, stop],
        },
        linkType: 'tournament',
      },
      include: [
        {
          model: Player,
          where: {
            id: players.map((p) => p.id),
          },
        },
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
}
