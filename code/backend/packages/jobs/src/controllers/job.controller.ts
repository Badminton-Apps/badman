import { AuthenticatedRequest, BaseController, Cron } from '@badvlasim/shared';
import { Response, Router } from 'express';
import { CronJob, GetScoresVisual } from '../models';
import { GetRankingVisual } from '../models/jobs/get-levels-visual';

export class JobController extends BaseController {
  private _path = '/job';
  private _jobs: CronJob[] = [];

  constructor(router: Router, private _authMiddleware: any) {
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
    const [scoresDb] = await Cron.findOrCreate({
      where: { type: 'sync-visual' },
      defaults: GetScoresVisual.dbEntry()
    }); 
    const visual = new GetScoresVisual(scoresDb);
    this._jobs.push(visual);

    const [rankingDb] = await Cron.findOrCreate({
      where: { type: 'ranking-visual' },
      defaults: GetRankingVisual.dbEntry()
    });  
    const ranking = new GetRankingVisual(rankingDb);
    this._jobs.push(ranking);
  }

  private _single = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send('No no no!!');
      return;
    }

    if (!request.query.type) {
      response.status(400).send('Missing type');
      return;
    }

    const foundJob = this._jobs.find(job => job.dbCron.type === request.query.type);
    
    if (foundJob) {
      foundJob.single();
      response.status(200).send('Job started');
    } else {
      response.status(400).send('Job not found');
    }
  };

  private _startJob = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send('No no no!!');
      return;
    }

    if (!request.query.type) {
      response.status(400).send('Missing type');
      return;
    }

    const foundJob = this._jobs.find(job => job.dbCron.type === request.query.type);
    
    if (foundJob) {
      foundJob.start();
      response.status(200).send('Job started');
    } else {
      response.status(400).send('Job not found');
    }
  };

  private _stopJob = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['change:job'])) {
      response.status(401).send('No no no!!');
      return;
    }

    if (!request.query.type) {
      response.status(400).send('Missing type');
      return;
    }

    const foundJob = this._jobs.find(job => job.dbCron.type === request.query.type);
    
    if (foundJob) {
      foundJob.stop();
      response.status(200).send('Job stopped');
    } else {
      response.status(400).send('Job not found');
    }
  };
}
