import { BaseController, logger } from '@badvlasim/shared';
import { Request, Response, Router } from 'express';

export class StatusController extends BaseController {
  private _path = '/status';

  constructor(router: Router) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(`${this._path}/`, this._status);
  }

  private _status = async (request: Request, response: Response) => {
    const fullUrl = request.protocol + '://' + request.headers.host + request.originalUrl;
    logger.info('Registered server', fullUrl);
  };
}
