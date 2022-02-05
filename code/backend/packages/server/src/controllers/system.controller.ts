import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
  RankingSystem
} from '@badvlasim/shared';
import { Request, RequestHandler, Response, Router } from 'express';

export class SystemController extends BaseController {
  private _path = '/systems';

  constructor(router: Router, private _authMiddleware: RequestHandler[], private _databaseService: DataBaseHandler) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(`${this._path}/:id/make-primary`, this._authMiddleware, this._makePrimary);
    this.router.get(`${this._path}/:id/caps`, this._getRankingSystemCaps);
  }

  private _getRankingSystemCaps = async (request: Request, response: Response) => {
    const system = await RankingSystem.findByPk(request.params.id);

    if (!system) {
      response.status(404);
      return;
    }

    response.json({
      amountOfLevels: system.amountOfLevels,
      pointsToGoUp: system.pointsToGoUp,
      pointsToGoDown: system.pointsToGoDown,
      pointsWhenWinningAgainst: system.pointsWhenWinningAgainst
    });
  };

 

  private _makePrimary = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['make-primary:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      await this._databaseService.makeSystemPrimary(request.params.id);
      response.send();
    } catch (error) {
      response.status(500).send(error);
    }
  };
}
