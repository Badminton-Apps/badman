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

export class UserController extends BaseController {
  private _path = '/user';

  constructor(router: Router, authRouter: Router) {
    super(router, authRouter);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.authRouter.get(`${this._path}/permissions`, this._permissions);
    this.authRouter.get(`${this._path}/profile`, this._profile);
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
        where: { sub: request.user.sub }
      });

      if (!player) {
        response.json(null);
        return;
      }

      const requestLink = await RequestLink.findOne({
        where: { PlayerId: player.id }
      });
      response.json({ player, request: requestLink });
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
