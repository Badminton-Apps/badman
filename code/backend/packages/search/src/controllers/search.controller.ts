import { AuthenticatedRequest, BaseController, logger, Player } from '@badvlasim/shared';
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
      const parts =
        `${request?.query?.query}`
          ?.toLowerCase()
          ?.replace(/[;\\\\/:*?\"<>|&',]/, ' ')
          ?.split(' ')
          ?.map((r) => r.trim())
          ?.filter((r) => r?.length > 0)
          ?.filter((r) => (r ?? null) != null) ?? [];

      const queries = [];
      for (const part of parts) {
        console.log(`Add part ${part}`);
        queries.push({
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${part}%` } },
            { lastName: { [Op.iLike]: `%${part}%` } },
            { memberId: { [Op.iLike]: `%${part}%` } }
          ]
        });
      }

      if (queries.length === 0) {
        return response.status(400).send({ message: 'No query provided' });
      }

      // Temporary structure to return the results.
      const result = await Player.findAll({
        attributes: ['slug', 'id', 'memberId', 'firstName', 'lastName', 'gender'],
        where: { [Op.and]: queries },
        limit: 100
      });

      response.status(200).send(result);
    } catch (error) {
      logger.error(`Something went wrong:`, { error });
      response.status(500).send({ message: error.message || 'Something went wrong' });
    }
  };
}
