import {
  Club,
  EventCompetition,
  EventTournament,
  Player,
} from '@badman/backend-database';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, WhereOptions } from 'sequelize';

@Injectable()
export class SearchService {
  private readonly like = Op.iLike;

  constructor(private readonly configService: ConfigService) {
    if (this.configService.get('DB_DIALECT') === 'sqlite') {
      this.like = Op.like;
    }
    
  }

  async search(
    query: string,
  ): Promise<(Player | Club | EventCompetition | EventTournament)[]> {
    const parts =
      `${query}`
        ?.toLowerCase()
        ?.replace(/[;\\\\/:*?"<>|&',]/, ' ')
        ?.split(' ')
        ?.map((r) => r.trim())
        ?.filter((r) => r?.length > 0)
        ?.filter((r) => (r ?? null) != null) ?? [];

    if (parts.length === 0) {
      return [];
    }

    const results = await Promise.all([
      this._getPlayerResult(parts),
      this._getClubs(parts),
      this._getCompetitionEvents(parts),
      this._getTournamnetsEvents(parts),
    ]);

    return results.flat();
  }

  private async _getPlayerResult(parts: string[]): Promise<Player[]> {
    const queries: WhereOptions = [
      {
        [Op.not]: {
          firstName: 'admin',
          lastName: 'super',
          memberId: '000',
        },
      },
    ];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { firstName: { [this.like]: `%${part}%` } },
          { lastName: { [this.like]: `%${part}%` } },
          { memberId: { [this.like]: `%${part}%` } },
        ],
      });
    }

    // Temporary structure to return the results.
    return await Player.findAll({
      attributes: ['id', 'slug', 'memberId', 'firstName', 'lastName', 'gender'],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getCompetitionEvents(
    parts: string[],
  ): Promise<EventCompetition[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [this.like]: `%${part}%` } }],
      });
    }

    // Temporary structure to return the results.
    return await EventCompetition.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['season', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getTournamnetsEvents(
    parts: string[],
  ): Promise<EventTournament[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [this.like]: `%${part}%` } }],
      });
    }

    // Temporary structure to return the results.
    return await EventTournament.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['firstDay', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  private async _getClubs(parts: string[]): Promise<Club[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [this.like]: `%${part}%` } },
          { abbreviation: { [this.like]: `%${part}%` } },
        ],
      });
    }

    // Temporary structure to return the results.
    return await Club.findAll({
      attributes: ['id', 'slug', 'name', 'abbreviation'],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }
}
