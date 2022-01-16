import { AuthenticatedRequest, BaseController, Player } from '@badvlasim/shared';
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
    const parts =
      `${request?.query?.query}`
        ?.toLowerCase()
        ?.replace(/[;\\\\/:*?\"<>|&',]/, ' ')
        ?.split(' ') ?? [];
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
    const result = await Player.findAll({
      attributes: ['slug', 'id', 'memberId', 'firstName', 'lastName', 'gender'],
      where: { [Op.and]: queries },
      limit: 100
    });

    response.status(200).send(result);
  };
}
