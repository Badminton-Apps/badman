import { AuthenticatedRequest, BaseController, DataBaseHandler } from '@badvlasim/shared';
import { Request, Response, Router } from 'express';

export class SystemController extends BaseController {
  private _path = '/systems';

  constructor(
    router: Router,
    authRouter: Router,
    private _databaseService: DataBaseHandler
  ) {
    super(router, authRouter);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.authRouter.post(`${this._path}/:id/make-primary`, this._makePrimary);

    this.router.get(`${this._path}/:id/caps`, this._getRankingSystemCaps);
  }

  private _getRankingSystemCaps = async (request: Request, response: Response) => {
    const system = await this._databaseService.getSystem({
      where: { id: parseInt(request.params.id, 10) }
    });

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

  private _deleteRankingSystem = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['delete:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }

    const system = await this._databaseService.getSystem({
      where: { id: parseInt(request.params.id, 10) }
    });

    if (!system) {
      response.status(404);
      return;
    }

    const result = await system.destroy();

    response.json(result);
  };


  private _makePrimary = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['make-primary:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      await this._databaseService.makeSystemPrimary(parseInt(request.params.id, 10));
      response.send();
    } catch (error) {
      response.status(500).send(error);
    }
  };
}
