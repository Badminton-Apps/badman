import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
  logger,
  Player,
  MailService,
  RequestLink
} from '@badvlasim/shared';
import { Response, Router } from 'express';
import { Club } from '../../../_shared';

export class UserController extends BaseController {
  private _path = '/user';

  constructor(router: Router, private _authMiddleware) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/permissions`, this._authMiddleware, this._permissions);
    this.router.get(`${this._path}/profile`, this._authMiddleware, this._profile);
    this.router.get(`${this._path}/test`, this._testMail);
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

  private _testMail() {
    const mailService = new MailService();
    mailService.sendNewPeopleMail('glenn.latomme@gmail.com');
  }
}
