import { BaseController } from '@badvlasim/shared';
import { Router } from 'express';

export class StatusController extends BaseController {
  private _path = '/servers';

  constructor(router: Router) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    //
  }
}
