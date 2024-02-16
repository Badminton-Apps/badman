import {
  Club,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  Team,
  TeamPlayerMembership,
} from '@badman/backend-database';
import { TeamMembershipType } from '@badman/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import { WorkBook, utils, write } from 'xlsx';

@Injectable()
export class AssemblyExportService {
  workbook!: WorkBook;
  system!: RankingSystem | null;

  async export(clubId: string, season: number) {
    this.workbook = utils.book_new();
    this.system = await RankingSystem.findOne({
      where: { primary: true },
    });

    const club = await Club.findByPk(clubId);

    if (!club) {
      throw new NotFoundException(`${Club.name}: ${clubId} not found`);
    }
    const teams = await club.getTeams({ where: { season } });
    const players = await this._getPlayers(teams, season);

    await this._addTeams(teams);
    this._addPlayers(players);

    return write(this.workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private async _addTeams(teams: Team[]) {
    for (const team of teams) {
      const teamPlayers = (await team.getPlayers()) as (Player & {
        TeamPlayerMembership: TeamPlayerMembership;
      })[];

      const base =
        teamPlayers?.filter(
          (p) => p.TeamPlayerMembership.membershipType == TeamMembershipType.REGULAR,
        ) ?? [];
      const replacements =
        teamPlayers?.filter(
          (p) => p.TeamPlayerMembership.membershipType == TeamMembershipType.BACKUP,
        ) ?? [];

      const rows = [];

      rows.push(['Vaste']);
      for (const player of base) {
        rows.push(this._getPlayerRow(player));
      }

      if (replacements.length) {
        rows.push([]);
        rows.push(['Reserves']);

        for (const player of replacements) {
          rows.push(this._getPlayerRow(player));
        }
      }

      const ws = utils.aoa_to_sheet(rows);
      utils.book_append_sheet(this.workbook, ws, `${team.name}`);
    }
  }

  private _getPlayerRow(player: Player) {
    const mayRanking = player.rankingPlaces?.[0];
    const currentRanking = player.rankingPlaces?.[0];

    return [
      player.gender,
      player.firstName,
      player.lastName,
      mayRanking?.single ?? this.system?.amountOfLevels,
      mayRanking?.double ?? this.system?.amountOfLevels,
      mayRanking?.mix ?? this.system?.amountOfLevels,
      currentRanking?.single ?? this.system?.amountOfLevels,
      currentRanking?.double ?? this.system?.amountOfLevels,
      currentRanking?.mix ?? this.system?.amountOfLevels,
    ];
  }

  private _addPlayers(players: Player[]) {
    const ws = utils.json_to_sheet(
      players?.map((p) => ({
        Gender: p.gender,
        'First Name': p.firstName,
        'Last Name': p.lastName,
      })),
    );
    utils.book_append_sheet(this.workbook, ws, 'Players');
  }

  private async _getPlayers(teams: Team[], season: number) {
    const players: Player[] = [];
    for (const team of teams) {
      const teamPlayers = await team.getPlayers({
        include: [
          {
            attributes: ['id', 'single', 'double', 'mix', 'rankingDate'],
            required: false,
            model: RankingLastPlace,
            where: {
              systemId: this.system?.id,
            },
          },
          {
            attributes: ['id', 'single', 'double', 'mix', 'rankingDate'],
            required: false,
            model: RankingPlace,
            limit: 1,
            where: {
              systemId: this.system?.id,
              rankingDate: {
                [Op.lte]: moment([season, 5, 10]).toDate(),
              },
              updatePossible: true,
            },
            order: [['rankingDate', 'DESC']],
          },
        ],
      });
      players.push(...teamPlayers);
    }

    // filter out duplicates
    const playerIds = players.map((p) => p.id);
    const uniquePlayers = players.filter((p, i) => playerIds.indexOf(p.id) === i);

    return uniquePlayers;
  }

  // private async _getReplacements(team: Team, players: Player[]) {
  //   // find the entry -> subevent
  //   const entry = await team.getEntry();
  //   const subevent = await entry.getSubEventCompetition();
  // }
}
