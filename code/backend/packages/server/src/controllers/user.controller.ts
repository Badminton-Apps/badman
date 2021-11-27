import {
  AuthenticatedRequest,
  BaseController,
  Club,
  DataBaseHandler,
  logger,
  Player,
  RequestLink
} from '@badvlasim/shared';
import { Response, Router } from 'express';

export class UserController extends BaseController {
  private _path = '/user';

  constructor(router: Router, private _authMiddleware, private _databaseService: DataBaseHandler) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/permissions`, this._authMiddleware, this._permissions);
    this.router.get(`${this._path}/profile`, this._authMiddleware, this._profile);
    this.router.post(`${this._path}/merge-accounts`, this._authMiddleware, this._merge);
  }

  private _permissions = async (request: AuthenticatedRequest, response: Response) => {
    try {
      response.json(request.user?.permissions || []);
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };
  private _profile = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (
        request?.user?.email === null ||
        request?.user === undefined ||
        request?.user?.email === undefined
      ) {
        response.json(null);
        return;
      }

      const player = await Player.findOne({
        where: { sub: request.user.sub },
        include: [{ model: Club, through: { where: { end: null } } }]
      });

      if (player) {
        response.json({ player });
        return;
      }

      const requestLink = await RequestLink.findOne({
        where: { sub: request.user.sub }
      });
      response.json({ request: requestLink });
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };

  private _merge = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['merge:player'])) {
      response.status(401).send('No no no!!');
      return;
    }

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      for (const toMerge of request.body.playerIdToMerge) {
        await this._databaseService.mergePlayers(request.body.playerId, toMerge, {
          transaction,
          canBeDifferentMemberId: request.body.canBeDifferentMemberId
        });
      }

      await transaction.commit();

      response.json();
    } catch (error) {
      transaction.rollback();
      logger.error(error);
      response.status(400).json(error);
    }
  };
}
