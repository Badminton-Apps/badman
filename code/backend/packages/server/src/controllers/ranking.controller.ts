import {
  BaseController,
  Game,
  GameType,
  logger,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem
} from '@badvlasim/shared';
import archiver from 'archiver';
import { Request, RequestHandler, Response, Router } from 'express';
import fs, { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from 'fs';
import moment from 'moment';
import { join } from 'path';
import { Op } from 'sequelize';

export class RankingController extends BaseController {
  private _path = '/ranking';

  private _resultFolder = join(__dirname, 'results');

  constructor(router: Router, private _authMiddleware: RequestHandler[]) {
    super(router);

    this._intializeRoutes();

    // Remove
    rmdirSync(this._resultFolder, { recursive: true });
    // Recreate
    mkdirSync(this._resultFolder, { recursive: true });
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/statistics/:system/:player/:gameType`, this._statistics);
    this.router.get(`${this._path}/export`, this._export);
    this.router.get(`${this._path}/exportVisual`, this._exportVisualBvlLfbb);
    this.router.get(`${this._path}/exportNotVisual`, this._exportVisualNonBvlLfbb);
  }

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
      for (const rankingPoint of player.rankingPoints) {
        let rankingPlaces = await RankingPlace.findAll({
          where: {
            [Op.and]: [
              {
                playerId: {
                  [Op.in]: rankingPoint.game.players.map((x) => x.id)
                }
              },
              {
                rankingDate: {
                  [Op.or]: [
                    moment(rankingPoint.rankingDate).subtract(3, 'months').toISOString(),
                    '2012-01-01 01:00:00'
                  ]
                }
              },
              { SystemId: where.SystemId }
            ]
          },
          attributes: ['playerId', 'single', 'double', 'mix', 'rankingDate', 'SystemId']
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
    const systemsIds: string[] = (request.query.systems as string).split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { SystemId: system }
        })
      );

      const startDate = moment(
        await RankingPlace.min('rankingDate', {
          where: { SystemId: system }
        })
      );

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
        where: {
          SystemId: system,
          updatePossible: true,
          rankingDate: {
            [Op.between]: [startDate.toISOString(), endDate.toISOString()]
          }
        },
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

      const outputFile = join(this._resultFolder, `${fileNameSafe}.csv`);
      writeFileSync(
        outputFile,
        `single, single points, single points downgrade, single inactive, double, double points, double points downgrade, double inactive, mix, mix points, mix points downgrade, mix inactive, rankingDate, name, gender, memberId\n${mapped.join(
          '\n'
        )}`,
        { encoding: 'utf8', flag: 'w' }
      );
      files.push(fileNameSafe);
      logger.info(`Exported ${outputFile}`);
    }

    return this._download(response, files);
  };

  private _exportVisualBvlLfbb = async (request: Request, response: Response) => {
    const systemsIds: string[] = (request.query.systems as string).split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { SystemId: system }
        })
      );

      const startDate = moment(
        await RankingPlace.min('rankingDate', {
          where: { SystemId: system }
        })
      );

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
          updatePossible: true,
          rankingDate: {
            [Op.between]: [startDate.toISOString(), endDate.toISOString()]
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

      const outputFile = join(this._resultFolder, `${fileNameSafe}.csv`);
      writeFileSync(
        outputFile,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join('\n')}`,
        { encoding: 'utf8', flag: 'w' }
      );
      files.push(fileNameSafe);
      logger.info(`Exported ${outputFile}`);
    }

    return this._download(response, files);
  };
  private _exportVisualNonBvlLfbb = async (request: Request, response: Response) => {
    const systemsIds: string[] = (request.query.systems as string).split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

     
      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { SystemId: system }
        })
      );

      const startDate = moment(
        await RankingPlace.min('rankingDate', {
          where: { SystemId: system }
        })
      );

  

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
          updatePossible: true,
          rankingDate: {
            [Op.between]: [startDate.toISOString(), endDate.toISOString()]
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

      const outputFile = join(this._resultFolder, `${fileNameSafe}.csv`);
      writeFileSync(
        outputFile,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join('\n')}`,
        { encoding: 'utf8', flag: 'w' }
      );
      files.push(fileNameSafe);
      logger.info(`Exported ${outputFile}`);
    }

    return this._download(response, files);
  };

  private async _download(response: Response, files: string[]) {
    response.header('Access-Control-Expose-Headers', 'Content-Disposition');

    if (files.length > 1) {
      const exportedfiles = files.map((file) => {
        const outputFile = join(this._resultFolder, `${file}.csv`);
        return {
          path: outputFile,
          name: `${file}.csv`
        };
      });
      const filename = `export_${moment().toISOString()}`;

      response.header('Content-Type', 'application/zip');
      response.header('Content-Disposition', `attachment; filename="${filename}.zip"`);

      const zip = archiver('zip', {
        zlib: { level: 9 }
      });
      zip.pipe(response); // res is a writable stream

      for (const file of exportedfiles) {
        zip.append(fs.createReadStream(file.path), { name: file.name });
      }

      zip.finalize();
    } else {
      response.header('Content-Type', 'text/csv');
      response.header('Content-Disposition', `attachment; filename="${files[0]}.csv"`);
      const stream = fs.createReadStream(`${this._resultFolder}/${files[0]}.csv`);
      stream.pipe(response);
    }

    // Cleanup
    for (const file of files) {
      unlinkSync(join(this._resultFolder, `${file}.csv`));
    }
  }
}
