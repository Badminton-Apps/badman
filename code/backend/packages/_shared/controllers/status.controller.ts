import { AuthenticatedRequest, BaseController } from '@badvlasim/shared';
import { Response, Router } from 'express';

export class HealthController {
  public router: Router = Router();

  constructor() {
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`/healthz`, this._alive);
  }

  private _alive = async (
    request: AuthenticatedRequest,
    response: Response
  ) => {
    response.send(true);
  };
}
