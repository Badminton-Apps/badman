import { AuthenticatedRequest, BaseController, logger, RankingSystem } from '@badvlasim/shared';
import { RequestHandler, Response, Router } from 'express';
import moment from 'moment';
import { RankingCalculator } from '../models';

export class SimulateController extends BaseController {
  private _path = '/simulate';

  constructor(
    router: Router,
    private _authMiddleware: RequestHandler[],
    private _calculator: RankingCalculator
  ) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(`${this._path}/reset`, this._authMiddleware, this._resetRunningRankingSystem);
    this.router.get(`${this._path}/calculate`, this._authMiddleware, this._calculateRanking);
  }

  private _calculateRanking = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['calculate:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }

    response.json('Processing started');
    const systems = (request.query.systems as string)
      .split(',')
      .map((systemId: string) => systemId);

    logger.debug(`Calculating systems ${systems}`);

    const end = moment(request.query.endDate as string);
    const startString = request.query.startDate as string;
    const fromStart = request.query.runningFromStart === 'true';
    let start = null;

    if (startString && startString.length >= 0) {
      start = moment(startString);
    }

    logger.silly('query', request.query, startString, start);

    this._calculator.calculateRanking(systems, end, fromStart, start).then(() => {
      logger.info('Processing done');
    });
  };

  private _resetRunningRankingSystem = async (
    request: AuthenticatedRequest,
    response: Response
  ) => {
    if (!request.user.hasAnyPermission(['edit:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }
    const systems = (request.body.systems as string).split(',').map((systemId: string) => systemId);
    logger.debug(`Resetting systems ${systems}`);

    for (const id of systems) {
      const system = await RankingSystem.findByPk(id);

      if (!system) {
        response.status(404);
        return;
      }

      system.runCurrently = false;
      system.save();
    }

    response.send();
  };
}
