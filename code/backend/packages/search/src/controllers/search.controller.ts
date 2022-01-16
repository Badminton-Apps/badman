import { AuthenticatedRequest, BaseController, logger, Player, EventCompetition, EventTournament, Club } from '@badvlasim/shared';
import { RequestHandler, Response, Router } from 'express';
import { Op } from 'sequelize';

export class SearchController extends BaseController {
  private _path = '/search';

  constructor(router: Router, private _authMiddleware: RequestHandler[]) {
    super(router);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}`, this._authMiddleware, this._search);
  }

  private _search = async (request: AuthenticatedRequest, response: Response) => {
    // Right now we querying the database. but we will use elasticsearch in the future.
    try {
      const { query } = request.query;
      const results = await this._searchDB(query as string);

      response.status(200).send(
        results?.map((p) => {
          return { value: p, type: p.constructor.name };
        })
      );
    } catch (error) {
      logger.error(`Something went wrong:`, { error });
      response.status(500).send({ message: error.message || 'Something went wrong' });
    }
  };

  private async _searchDB(query: string) {
    const parts =
      `${query}`
        ?.toLowerCase()
        ?.replace(/[;\\\\/:*?\"<>|&',]/, ' ')
        ?.split(' ')
        ?.map((r) => r.trim())
        ?.filter((r) => r?.length > 0)
        ?.filter((r) => (r ?? null) != null) ?? [];

    if (parts.length === 0) {
      return [];
    }

    const results = await Promise.all(
      [
        this._getPlayerResult(parts),
        this._getClubs(parts),
        this._getCompetitionEvents(parts),
        this._getTournamnetsEvents(parts),
      ]
    )

    return results.flat();
  }

  private async _getPlayerResult(parts: string[]): Promise<Player[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${part}%` } },
          { lastName: { [Op.iLike]: `%${part}%` } },
          { memberId: { [Op.iLike]: `%${part}%` } }
        ]
      });
    }

    // Temporary structure to return the results.
    return await Player.findAll({
      attributes: ['id', 'slug', 'memberId', 'firstName', 'lastName', 'gender'],
      where: { [Op.and]: queries },
      limit: 100
    });
  }

  private async _getCompetitionEvents(parts: string[]): Promise<EventCompetition[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${part}%` } },
        ]
      });
    }

    // Temporary structure to return the results.
    return await EventCompetition.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['startYear', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100
    });
  }

  private async _getTournamnetsEvents(parts: string[]): Promise<EventTournament[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${part}%` } },
        ]
      });
    }

    // Temporary structure to return the results.
    return await EventTournament.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['firstDay', 'DESC']],
      where: { [Op.and]: queries },
      limit: 100
    });
  }

  
  private async _getClubs(parts: string[]): Promise<Club[]> {
    const queries = [];
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${part}%` } },
          { abbreviation: { [Op.iLike]: `%${part}%` } },
        ]
      });
    }

    // Temporary structure to return the results.
    return await Club.findAll({
      attributes: ['id', 'slug', 'name', 'abbreviation'],
      where: { [Op.and]: queries },
      limit: 100
    });
  }
}
