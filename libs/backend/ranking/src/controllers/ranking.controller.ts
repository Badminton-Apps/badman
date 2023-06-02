import { Player, RankingPlace, RankingSystem } from '@badman/backend-database';
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import fs, {
  existsSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import moment from 'moment';
import archiver from 'archiver';
import { join } from 'path';
import { Op } from 'sequelize';

@Controller({
  path: 'ranking',
})
export class RankingController {
  private readonly logger = new Logger(RankingController.name);
  private _resultFolder = join(__dirname, 'results');

  constructor() {
    if (existsSync(this._resultFolder)) {
      // Remove
      rmdirSync(this._resultFolder, { recursive: true });
    }

    // Recreate
    mkdirSync(this._resultFolder, { recursive: true });
  }

  @Get('export')
  async export(@Res() response: FastifyReply, @Query() query: { systems: string }) {
    const systemsIds: string[] = query.systems.split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { systemId: system, updatePossible: true },
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
          'rankingDate',
        ],
        where: {
          systemId: system,
          updatePossible: true,
          rankingDate: endDate.toISOString(),
        },
        include: [
          {
            model: Player,
            attributes: ['firstName', 'lastName', 'gender', 'memberId'],
          },
        ],
      });

      const mapped = results.map(
        (ranking: RankingPlace) =>
          `${ranking.single},${ranking.singlePoints},${
            ranking.singlePointsDowngrade
          },${ranking.singleInactive},${ranking.double},${
            ranking.doublePoints
          },${ranking.doublePointsDowngrade},${ranking.doubleInactive},${
            ranking.mix
          },${ranking.mixPoints},${ranking.mixPointsDowngrade},${
            ranking.mixInactive
          },${ranking.rankingDate.toISOString()},${ranking.player.firstName} ${
            ranking.player.lastName
          },${ranking.player.gender},${ranking.player.memberId}`
      );

      const outputFile = join(this._resultFolder, `${fileNameSafe}.csv`);
      // remove old files
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
      writeFileSync(
        outputFile,
        `single, single points, single points downgrade, single inactive, double, double points, double points downgrade, double inactive, mix, mix points, mix points downgrade, mix inactive, rankingDate, name, gender, memberId\n${mapped.join(
          '\n'
        )}`,
        { encoding: 'utf8', flag: 'wx' }
      );
      files.push(fileNameSafe);
      this.logger.log(`Exported ${outputFile}`);
    }
    return this._download(response, files);
  }

  @Get('exportVisual')
  async exportVisual(
    @Res() response: FastifyReply,
    @Query() query: { systems: string }
  ) {
    const systemsIds: string[] = query.systems.split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { systemId: system },
        })
      );

      const startDate = moment(
        await RankingPlace.min('rankingDate', {
          where: { systemId: system },
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
          'rankingDate',
        ],
        where: {
          systemId: system,
          updatePossible: true,
          rankingDate: {
            [Op.between]: [startDate.toISOString(), endDate.toISOString()],
          },
        },
        include: [
          {
            model: Player,
            attributes: ['firstName', 'lastName', 'gender', 'memberId'],
          },
        ],
      });

      const mapped = results
        .filter((ranking: RankingPlace) => ranking.player.memberId !== null)
        .filter(
          (ranking: RankingPlace) =>
            ranking.player.memberId[0] === '5' ||
            ranking.player.memberId[0] === '3'
        )
        .map((ranking: RankingPlace) => {
          const lines = [];
          const baseinfo = `${ranking.player.memberId},${
            ranking.player.firstName
          } ${ranking.player.lastName},${ranking.player.gender},${
            ranking.single
          },${ranking.double},${ranking.mix},${moment(
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
      // remove old files
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
      writeFileSync(
        outputFile,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join(
          '\n'
        )}`,
        { encoding: 'utf8', flag: 'w' }
      );
      files.push(fileNameSafe);
      this.logger.log(`Exported ${outputFile}`);
    }

    return this._download(response, files);
  }

  @Get('exportNotVisual')
  async exportNotVisual(
    @Res() response: FastifyReply,
    @Query() query: { systems: string }
  ) {
    const systemsIds: string[] = query.systems.split(',');

    const files = [];
    for (const system of systemsIds) {
      const fileNameSafe = (
        await RankingSystem.findByPk(system, { attributes: ['name'] })
      )?.name.replace(/[/\\?%*:|"<>]/g, '-');

      const endDate = moment(
        await RankingPlace.max('rankingDate', {
          where: { systemId: system },
        })
      );

      const startDate = moment(
        await RankingPlace.min('rankingDate', {
          where: { systemId: system },
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
          'rankingDate',
        ],
        where: {
          systemId: system,
          updatePossible: true,
          rankingDate: {
            [Op.between]: [startDate.toISOString(), endDate.toISOString()],
          },
        },
        include: [
          {
            model: Player,
            attributes: ['firstName', 'lastName', 'gender', 'memberId'],
          },
        ],
      });

      const mapped = results
        .filter((ranking: RankingPlace) => ranking.player.memberId !== null)
        .filter(
          (ranking: RankingPlace) =>
            ranking.player.memberId[0] !== '5' &&
            ranking.player.memberId[0] !== '3'
        )
        .map((ranking: RankingPlace) => {
          const lines = [];
          const baseinfo = `${ranking.player.memberId},${
            ranking.player.firstName
          } ${ranking.player.lastName},${ranking.player.gender},${
            ranking.single
          },${ranking.double},${ranking.mix},${moment(
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

      // remove old files
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }

      writeFileSync(
        outputFile,
        `lidnummer, name, gender, single, double, mix, date, reden\n${mapped.join(
          '\n'
        )}`,
        { encoding: 'utf8', flag: 'w' }
      );
      files.push(fileNameSafe);
      this.logger.log(`Exported ${outputFile}`);
    }

    return this._download(response, files);
  }

  private async _download(response: FastifyReply, files: string[]) {
    const filename = `export_${moment().toISOString()}`;
    response.header('Access-Control-Expose-Headers', 'Content-Disposition');

    if (files.length > 1) {
      const exportedfiles = files.map((file) => {
        const outputFile = join(this._resultFolder, `${file}.csv`);
        return {
          path: outputFile,
          name: `${file}.csv`,
        };
      });

      response.header('Content-Type', 'application/zip');
      response.header(
        'Content-Disposition',
        `attachment; filename="${filename}.zip"`
      );
      const zip = archiver('zip', {
        zlib: { level: 9 },
      });
      // this probably won't work 
      throw new Error('This probably won\'t work');
      zip.pipe(response); // res is a writable stream

      for (const file of exportedfiles) {
        zip.append(fs.createReadStream(file.path), { name: file.name });
      }

      zip.finalize();
    } else {
      response.header('Content-Type', 'text/csv');
      response.header(
        'Content-Disposition',
        `attachment; filename="${filename + files[0]}.csv"`
      );
      const outputFile = join(this._resultFolder, `${files[0]}.csv`);
      const stream = fs.createReadStream(outputFile);

      response.type('text/csv').send(stream);
    }

    // Delete files after 10 minutes

    setTimeout(() => {
      // Cleanup
      for (const file of files) {
        unlinkSync(join(this._resultFolder, `${file}.csv`));
      }
    }, 600000);
  }
}
