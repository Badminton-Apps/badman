import { AuthenticatedRequest, BaseController } from '@badvlasim/shared';
import { Response, Router } from 'express';

export class StatusController {
  private _path = '/status';
  public router: Router = Router({strict: true});


  constructor() {
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/healthz`, this._alive);
  }

  private _alive = async (request: AuthenticatedRequest, response: Response) => {
    response.send(true);
  };
}
