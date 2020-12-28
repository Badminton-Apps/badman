import {
  BaseController,
  DataBaseHandler,
  Game,
  GameType,
  logger,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem
} from '@badvlasim/shared';
import async from 'async';
import { Request, Response, Router } from 'express';
import fs, { writeFileSync } from 'fs';
import moment from 'moment';
import { Op } from 'sequelize';
import zipstream from 'zip-stream';

export class RankingController extends BaseController {

  private _path = '/ranking';

  constructor(
    router: Router,
    authRouter: Router,
    private _databaseService: DataBaseHandler
  ) {
    super(router, authRouter);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    logger.debug('HELLO?', this);
    this.router.get(`${this._path}/statistics/:system/:player/:gameType`, this._statistics);
    this.router.get(`${this._path}/export`, this._export);
    this.router.get(`${this._path}/exportVisual`, this._exportVisualBvlLfbb);
    this.router.get(`${this._path}/exportNotVisual`, this._exportVisualNonBvlLfbb);
    this.router.get(`${this._path}/top`, this._top);
  }

  private _top = async (request: Request, response: Response) => {
    const where = {
      SystemId: parseInt(request.query.systemId as string, 10),
      rankingDate: new Date(request.query.date as string)
    };

    const places = await RankingPlace.findAll({
      where,
      attributes: ['single', 'singleRank', 'double', 'doubleRank', 'mix', 'mixRank'],
      include: [
        {
          model: Player,
          attributes: ['id', 'firstName', 'lastName'],
          where: {
            gender: request.query.gender ?? 'M'
          },
          required: true
        }
      ],
      order: [
        [request.query.sortBy as string, request.query.sortOrder as string],
        [`${request.query.sortBy as string}Rank`, request.query.sortOrder as string]
      ],
      limit: parseInt(request.query.limit as string, 10),
      offset: parseInt(request.query.offset as string, 10)
    });

    const count = await RankingPlace.count({
      where,
      include: [
        {
          model: Player,
          where: {
            gender: request.query.gender ?? 'M'
          },
          required: true
        }
      ]
    });

    response.json({ rankingPlaces: places, total: count });
  };

   

  private _statistics = async (request: Request, response: Response) => {
    const systemId = parseInt(request.params.system, 10);
    const playerId = parseInt(request.params.player, 10);
    const gameType = request.params.gameType;

    if ((await Player.count({ where: { id: playerId } })) <= 0) {
      response.status(404).send(`Player ${playerId} not found`);
      return;
    }
    if ((await RankingSystem.count({ where: { id: systemId } })) <= 0) {
      response.status(404).send(`System ${systemId} not found`);
      return;
    }
    if (GameType[gameType] === undefined) {
      response.status(404).send(`Game Type ${gameType} not found`);
      return;
    }

    logger.info(
      `Requesting statistics on player ${parseInt(request.params.player, 10)} for system ${parseInt(
        request.params.system,
        10
      )}`
    );

    const where = { SystemId: parseInt(request.params.system, 10) };

    const rankingType = await RankingSystem.findByPk(where.SystemId);

    const player = await Player.findByPk(parseInt(request.params.player, 10), {
      attributes: ['id', 'firstName', 'lastName'],
      include: [
        {
          model: RankingPoint,
          attributes: ['points', 'rankingDate'],
          where,
          include: [
            {
              model: Game,
              where: {
                gameType: GameType[gameType]
              },
              attributes: ['id', 'winner', 'gameType', 'playedAt'],
              include: [{ model: Player, attributes: ['id'] }]
            }
          ],
          required: false
        }
      ],
      order: [
        [
          { model: RankingPoint, as: 'rankingPoints' },
          { model: Game, as: 'game' },
          'playedAt',
          'ASC'
        ]
      ]
    });

    const rankingPoints = [];

    if (player.rankingPoints) {
      for await (const rankingPoint of player.rankingPoints) {
        let rankingPlaces = await RankingPlace.findAll({
          where: {
            [Op.and]: [
              {
                PlayerId: {
                  [Op.in]: rankingPoint.game.players.map(x => x.id)
                }
              },
              {
                rankingDate: {
                  [Op.or]: [
                    moment(rankingPoint.rankingDate)
                      .subtract(3, 'months')
                      .toISOString(),
                    '2012-01-01 01:00:00'
                  ]
                }
              },
              { SystemId: where.SystemId }
            ]
          },
          attributes: ['PlayerId', 'single', 'double', 'mix', 'rankingDate', 'SystemId']
        });

        rankingPlaces = rankingPlaces.sort(
          (a, b) => b.rankingDate.getTime() - a.rankingDate.getTime()
        );

        rankingPoints.push({
          ...rankingPoint.toJSON(),
          game: {
            ...rankingPoint.game.toJSON()
          }
        });
      }
    }

    response.json({
      ...player.toJSON(),
      rankingPoints,
      type: rankingType.name
    });
  };

  private _export = async (request: Request, response: Response) => {
    const systemsIds: number[] = (request.query.systems as string)
      .split(',')
      .map((systemId: string) => parseInt(systemId, 10));

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await this._databaseService.getSystem({ where: { id: system }, attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const results = await RankingPlace.findAll({
        attributes: [
          'single',
          'double',
          'mix',
          'singlePoints',
          'doublePoints',
          'mixPoints',
          'singlePointsDowngrade',
          'doublePointsDowngrade',
          'mixPointsDowngrade',
          'singleInactive',
          'mixInactive',
          'doubleInactive',
          'rankingDate'
        ],
        where: { SystemId: system },
        include: [{ model: Player, attributes: ['firstName', 'lastName', 'gender', 'memberId'] }]
      });

      const mapped = results.map(
        (ranking: RankingPlace) =>
          `${ranking.single},${ranking.singlePoints},${ranking.singlePointsDowngrade},${
            ranking.singleInactive
          },${ranking.double},${ranking.doublePoints},${ranking.doublePointsDowngrade},${
            ranking.doubleInactive
          },${ranking.mix},${ranking.mixPoints},${ranking.mixPointsDowngrade},${
            ranking.mixInactive
          },${ranking.rankingDate.toISOString()},${ranking.player.firstName} ${
            ranking.player.lastName
          },${ranking.player.gender},${ranking.player.memberId}`
      );

      writeFileSync(
        `results/${fileNameSafe}.csv`,
        `single, single points, single points downgrade, single inactive, double, double points, double points downgrade, double inactive, mix, mix points, mix points downgrade, mix inactive, rankingDate, name, gender, memberId\n${mapped.join(
          '\n'
        )}`
      );
      files.push(fileNameSafe);
      logger.info(`Exported results/${fileNameSafe}.csv`);
    }

    return this._download(response, files);
  };

  private _exportVisualBvlLfbb = async (request: Request, response: Response) => {
    const systemsIds: number[] = (request.query.systems as string)
      .split(',')
      .map((systemId: string) => parseInt(systemId, 10));

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await this._databaseService.getSystem({ where: { id: system }, attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const rankingDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { SystemId: system }
        })
      );

      const endDate = rankingDate.toISOString();
      const startDate = rankingDate
        .subtract(2, 'years') // 2 years of data
        .subtract(1, 'month') // some margin :)
        .toISOString();

      const results = await RankingPlace.findAll({
        attributes: [
          'single',
          'double',
          'mix',
          'singleInactive',
          'mixInactive',
          'doubleInactive',
          'rankingDate'
        ],
        where: {
          SystemId: system,
          rankingDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{ model: Player, attributes: ['firstName', 'lastName', 'gender', 'memberId'] }]
      });

      const mapped = results
        .filter((ranking: RankingPlace) => ranking.player.memberId !== null)
        .filter(
          (ranking: RankingPlace) =>
            ranking.player.memberId[0] === '5' || ranking.player.memberId[0] === '3'
        )
        .map((ranking: RankingPlace) => {
          const lines = [];
          const baseinfo = `${ranking.player.memberId},${ranking.player.firstName} ${
            ranking.player.lastName
          },${ranking.player.gender},${ranking.single},${ranking.double},${ranking.mix},${moment(
            ranking.rankingDate
          ).format('YYYY-MM-DD')}`;

          if (ranking.singleInactive) {
            lines.push([`${baseinfo},1`]);
          }
          if (ranking.doubleInactive) {
            lines.push([`${baseinfo},2`]);
          }
          if (ranking.mixInactive) {
            lines.push([`${baseinfo},3`]);
          }

          if (lines.length === 0) {
            lines.push([`${baseinfo},0`]);
          }
          return lines;
        })
        .flat();

      writeFileSync(
        `results/${fileNameSafe}.csv`,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join('\n')}`
      );
      files.push(fileNameSafe);
      logger.info(`Exported results/${fileNameSafe}.csv`);
    }

    return this._download(response, files);
  };
  private _exportVisualNonBvlLfbb = async (request: Request, response: Response) => {
    const systemsIds: number[] = (request.query.systems as string)
      .split(',')
      .map((systemId: string) => parseInt(systemId, 10));

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await this._databaseService.getSystem({ where: { id: system }, attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const rankingDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { SystemId: system }
        })
      );

      const endDate = rankingDate.toISOString();
      const startDate = rankingDate
        .subtract(2, 'years') // 2 years of data
        .subtract(1, 'month') // some margin :)
        .toISOString();

      const results = await RankingPlace.findAll({
        attributes: [
          'single',
          'double',
          'mix',
          'singleInactive',
          'mixInactive',
          'doubleInactive',
          'rankingDate'
        ],
        where: {
          SystemId: system,
          rankingDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{ model: Player, attributes: ['firstName', 'lastName', 'gender', 'memberId'] }]
      });

      const mapped = results
        .filter((ranking: RankingPlace) => ranking.player.memberId !== null)
        .filter(
          (ranking: RankingPlace) =>
            ranking.player.memberId[0] !== '5' && ranking.player.memberId[0] !== '3'
        )
        .map((ranking: RankingPlace) => {
          const lines = [];
          const baseinfo = `${ranking.player.memberId},${ranking.player.firstName} ${
            ranking.player.lastName
          },${ranking.player.gender},${ranking.single},${ranking.double},${ranking.mix},${moment(
            ranking.rankingDate
          ).format('YYYY-MM-DD')}`;

          if (ranking.singleInactive) {
            lines.push([`${baseinfo},1`]);
          }
          if (ranking.doubleInactive) {
            lines.push([`${baseinfo},2`]);
          }
          if (ranking.mixInactive) {
            lines.push([`${baseinfo},3`]);
          }

          if (lines.length === 0) {
            lines.push([`${baseinfo},0`]);
          }
          return lines;
        })
        .flat();

      writeFileSync(
        `results/${fileNameSafe}.csv`,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join('\n')}`
      );
      files.push(fileNameSafe);
      logger.info(`Exported results/${fileNameSafe}.csv`);
    }

    return this._download(response, files);
  };

  private _download(response: Response, files: string[]) {
    const filename = `export_${moment().toISOString()}`;
    response.header('Access-Control-Expose-Headers', 'Content-Disposition');

    if (files.length > 1) {
      const exportedfiles = files.map(file => {
        return {
          path: `results/${file}.csv`,
          name: `${file}.csv`
        };
      });

      const myCb = (err: any, bytes?: undefined) => {
        if (err) logger.error('Something went wrong exporting the files', err);
      };

      response.header('Content-Type', 'application/zip');
      response.header('Content-Disposition', `attachment; filename="${filename}.zip"`);

      const zip = zipstream({ level: 1 });
      zip.pipe(response); // res is a writable stream

      const addFile = (file: { path: fs.PathLike; name: any }, cb: any) => {
        zip.entry(fs.createReadStream(file.path), { name: file.name }, cb);
      };

      async.forEachSeries(exportedfiles, addFile, (err: any) => {
        if (err) myCb(err);
        zip.finalize();
        myCb(null, zip.getBytesWritten());
      });
      return;
    } else {
      response.header('Content-Type', 'text/csv');
      response.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
      const stream = fs.createReadStream(`results/${files[0]}.csv`);
      stream.pipe(response);
    }
  }
}
