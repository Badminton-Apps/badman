import { BaseController, EVENTS, SocketEmitter } from '@badvlasim/shared';
import { logger } from 'elastic-apm-node';
import { Request, Response, Router } from 'express';

export class TestController extends BaseController {
  private _path = '/test';

  constructor(router: Router) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/emit`, this._test);
  }

  private _test = async (request: Request, response: Response) => {
    try {
      const result = SocketEmitter.emit(EVENTS.JOB.CRON_STARTED, {
        id: '"4a0c2390-b9b1-4d44-ad1f-dbc87292a233"'
      });
      response.send({ message: result ? 'roger-roger' : 'Nope' });
    } catch (e) {
      logger.error(e);
      response.send({ message: e.message });
    }
  };
}
