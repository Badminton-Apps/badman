import { AuthenticatedRequest, BaseController, Cron, logger } from '@badvlasim/shared';
import { RequestHandler, Response, Router } from 'express';
import { CronJob, GetRankingVisual, GetScoresVisual } from '../models';

export class JobController extends BaseController {
  private _path = '/job';
  private _jobs: CronJob[] = [];

  constructor(router: Router, private _authMiddleware: RequestHandler[]) {
    super(router);

    this._intializeRoutes();
    this._initializeJobs();
  }

  private _intializeRoutes() {
    this.router.post(`${this._path}/single-run`, this._authMiddleware, this._single);
    this.router.post(`${this._path}/start`, this._authMiddleware, this._startJob);
    this.router.post(`${this._path}/stop`, this._authMiddleware, this._stopJob);
  }

  private async _initializeJobs() {
    // VisualSync
    const scoresVisual = GetScoresVisual.dbEntryDaily();
    const [scoresDb] = await Cron.findOrCreate({
      where: { type: scoresVisual.type },
      defaults: scoresVisual
    });

    const visual = new GetScoresVisual(scoresDb, { newGames: true });
    this._jobs.push(visual);

    const scoresVisualFull = GetScoresVisual.dbEntryWeekly();
    const [scoresDbFull] = await Cron.findOrCreate({
      where: { type: scoresVisualFull.type },
      defaults: scoresVisualFull
    });

    const visualFull = new GetScoresVisual(scoresDbFull);
    this._jobs.push(visualFull);

    const levelsVisual = GetRankingVisual.dbEntry();
    const [rankingDb] = await Cron.findOrCreate({
      where: { type: levelsVisual.type },
      defaults: levelsVisual
    });
    const ranking = new GetRankingVisual(rankingDb);
    this._jobs.push(ranking);
  }

  private _single = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send({ message: 'No no no!!' });
      return;
    }

    if (!request.query.type) {
      response.status(400).send({ message: 'Missing type' });
      return;
    }

    const foundJob = this._jobs.find((job) => job.dbCron.type === request.query.type);

    if (foundJob) {
      try {
        foundJob.single(request.body);
        response.status(200).send({ message: 'Running job' });
      } catch (e) {
        response.status(500).send(e.message);
        return;
      }
    } else {
      response.status(400).send({ message: 'Job not found' });
    }
  };

  private _startJob = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send({ message: 'No no no!!' });
      return;
    }

    if (!request.query.type) {
      response.status(400).send({ message: 'Missing type' });
      return;
    }

    const foundJob = this._jobs.find((job) => job.dbCron.type === request.query.type);

    if (foundJob) {
      logger.info(`Scheduling cron job ${foundJob.dbCron.type}`);
      foundJob.start();
      response.status(200).send({ message: 'Job started' });
    } else {
      response.status(400).send({ message: 'Job not found' });
    }
  };

  private _stopJob = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send({ message: 'No no no!!' });
      return;
    }

    if (!request.query.type) {
      response.status(400).send({ message: 'Missing type' });
      return;
    }

    const foundJob = this._jobs.find((job) => job.dbCron.type === request.query.type);

    if (foundJob) {
      logger.info(`Unscheduling cron job ${foundJob.dbCron.type}`);
      foundJob.stop();
      response.status(200).send({ message: 'Job stopped' });
    } else {
      response.status(400).send({ message: 'Job not found' });
    }
  };
}
