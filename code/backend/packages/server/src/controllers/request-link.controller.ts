import {
  AuthenticatedRequest,
  BaseController,
  logger,
  Player,
  RequestLink
} from '@badvlasim/shared';
import { Response, Router } from 'express';

export class RequestLinkController extends BaseController {
  private _path = '/request-link';
  constructor(router: Router, private _authMiddleware) {
    super(router);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}`, this._authMiddleware, this._requestedLinks);
    this.router.post(`${this._path}/:playerId`, this._authMiddleware, this._requestLink);
    this.router.put(`${this._path}/:accept/:ids`, this._authMiddleware, this._linkAccount);
  }

  private _requestLink = async (request: AuthenticatedRequest, response: Response) => {
    try {
      const playerId = request.params.playerId;
      const player = await Player.findByPk(playerId);

      if (!player) {
        response.status(404).send(`Player ${playerId} not found`);
        return;
      }

      if (player.email != null) {
        response.send(`Player already has player ${player.id}`);
      }

      const props = {
        PlayerId: player.id,
        email: request.user.email
      };

      const [linkRequest] = await RequestLink.findOrCreate({
        where: props,
        defaults: props
      });

      response.json(linkRequest);
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };

  private _requestedLinks = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (!request.user.hasAnyPermission(['link:account'])) {
        response.status(401).send('No no no!!');
        return;
      }

      const linkRequest = await RequestLink.findAll({
        include: [{ model: Player }]
      });
      response.json(linkRequest);
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };

  private _linkAccount = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (!request.user.hasAnyPermission(['link:account'])) {
        response.status(401).send('No no no!!');
        return;
      }

      const linkRequests = await RequestLink.findAll({
        where: { id: request.params.ids.split(',') }
      });

      // // Only if accepted response
      // if (request.params.accept === 'true') {
      //   await Player.bulkCreate(
      //     linkRequests.map(x => {
      //       return {
      //         id: x.PlayerId,
      //       };
      //     }),
      //     { updateOnDuplicate: ['email'] }
      //   );
      // }

      await RequestLink.destroy({
        where: { id: linkRequests.map(x => x.id) }
      });

      response.json({ message: 'done' });
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };
}
