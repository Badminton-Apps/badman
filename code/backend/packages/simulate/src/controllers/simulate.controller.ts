import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
  Game,
  GroupSubEvents,
  GroupSystems,
  logger,
  Player,
  RankingSystem,
  RankingSystemGroup
} from '@badvlasim/shared';
import { Response, Router } from 'express';
import moment from 'moment';
import { RankingCalculator } from '../models';
import { Op } from 'sequelize';

export class SimulateController extends BaseController {
  private _path = '/simulate';

  constructor(
    router: Router,
    authRouter: Router,
    private _databaseService: DataBaseHandler,
    private _calculator: RankingCalculator
  ) {
    super(router, authRouter);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.authRouter.post(`${this._path}/reset`, this._resetRunningRankingSystem);
    this.authRouter.get(`${this._path}/calculate`, this._calculateRanking);
  }

  private _calculateRanking = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['calculate:ranking'])) {
      response.status(401).send('No no no!!');
      return;
    }

    response.json('Processing started');

    logger.debug('Systems', request.query.systems);

    const systems = (request.query.systems as string)
      .split(',')
      .map((systemId: string) => systemId);
    const end = moment(request.query.endDate as string);
    const startString = request.query.startDate as string;
    const fromStart = request.query.runningFromStart === 'true';
    let start = null;

    if (startString && startString.length >= 0) {
      start = moment(startString);
    }

    logger.silly('query', request.query, startString, start);

    this._calculator.calculateRanking(systems, end, fromStart, start).then(_ => {
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
    logger.debug('Resetting systems', request.body.systems);

    const systems = (request.body.systems as string).split(',').map((systemId: string) => systemId);

    for await (const id of systems) {
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
