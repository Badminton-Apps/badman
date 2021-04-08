import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
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

      if (player.sub != null) {
        return response.send(`Player already has player ${player.id}`);
      }

      const props = {
        playerId: player.id,
        sub: request.user.sub
      };

      const [linkRequest] = await RequestLink.findOrCreate({
        where: props,
        defaults: props
      });

      response.json(linkRequest.toJSON());
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
    }
  };

  private _requestedLinks = async (request: AuthenticatedRequest, response: Response) => {
    try {
      if (!request.user.hasAnyPermission(['link:player'])) {
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
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      if (!request.user.hasAnyPermission(['link:player'])) {
        response.status(401).send('No no no!!');
        return;
      }

      const linkRequests = await RequestLink.findAll({
        where: { id: request.params.ids.split(',') },
        transaction
      });

      for (const linkrequest of linkRequests) {
        const dbPlayer = await Player.findByPk(linkrequest.playerId, { transaction });
        dbPlayer.sub = linkrequest.sub;
        await dbPlayer.save({ transaction });
      }

      await RequestLink.destroy({
        where: { id: linkRequests.map(x => x.id) },
        transaction
      });

      await transaction.commit();
      response.json({ message: 'done' });
    } catch (error) {
      logger.error(error);
      response.status(400).json(error);
      await transaction.rollback();
    }
  };
}
