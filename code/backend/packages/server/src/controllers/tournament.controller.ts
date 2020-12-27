import {logger,  DataBaseHandler, Event, AuthenticatedRequest, BaseController } from '@badvlasim/shared';
import { Request, Response, Router } from 'express';

export class TournamentController extends BaseController {

  private _path = '/tournament';

  constructor(
    router: Router,
    authRouter: Router
  ) {
    super(router, authRouter);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/:id`, this._getTournament);
    this.authRouter.post(`${this._path}/:id/make-primary`, this._makePrimary);
  }


  private _getTournament = async (request: Request, response: Response) => {
    try {
      const event = await Event.findByPk(request.params.id);
      response.json(event);
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };

  private _makePrimary = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (!request.user.hasAnyPermission(['tournament:ranking'])) {
        response.status(401).send('No no no!!');
        return;
      }

      const event = await Event.findByPk(request.params.id);
      response.json(event);
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };
}
