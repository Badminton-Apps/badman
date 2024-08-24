import { User } from '@badman/backend-authorization';
import {
  EncounterValidationOutput,
  EncounterValidationService,
} from '@badman/backend-change-encounter';
import { EncounterChange, Player, Team } from '@badman/backend-database';
import { CpGeneratorService, PlannerService } from '@badman/backend-generator';
import { MailingService } from '@badman/backend-mailing';
import { RankingQueue, SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Queue } from 'bull';
import { FastifyReply } from 'fastify';
import { createReadStream } from 'fs';
import { basename, extname } from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectQueue(RankingQueue) private _rankingQueue: Queue,
    @InjectQueue(SyncQueue) private _syncQueue: Queue,
    private cpGen: CpGeneratorService,
    private planner: PlannerService,
    private mailingService: MailingService
  ) {}

  @Post('queue-job')
  async getQueueJob(
    @User() user: Player,
    @Body()
    args: {
      job: string;
      queue: typeof SyncQueue | typeof RankingQueue;
      jobArgs: { [key: string]: unknown };
      removeOnComplete: boolean;
      removeOnFail: boolean;
    },
  ) {
    this.logger.debug(
      `Adding job ${args.job} to queue ${args.queue} for user ${user?.fullName || 'unknown'}, permissions: ${await user.hasAnyPermission(['change:job'])}`,
    );

    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new UnauthorizedException('You do not have permission to do this');
    }

    if (!args.jobArgs) {
      args.jobArgs = {};
    }

    // append the user id to the job args
    args.jobArgs['userId'] = user.id;

    switch (args.queue) {
      case SyncQueue:
        return this._syncQueue.add(args.job, args.jobArgs, {
          removeOnComplete: args.removeOnComplete || true,
          removeOnFail: args.removeOnFail || 1,
        });
      case RankingQueue:
        return this._rankingQueue.add(args.job, args.jobArgs, {
          removeOnComplete: args.removeOnComplete || true,
          removeOnFail: args.removeOnFail || 1,
        });
      default:
        throw new HttpException('Unknown queue', 500);
    }
  }

  @Get('cp')
  async getCp(@Res() res: FastifyReply, @Query() query: { eventId: string }) {
    this.logger.debug('Generating CP');
    const fileLoc = await this.cpGen.generateCpFile(query.eventId);
    if (!fileLoc) {
      throw new HttpException('Could not generate CP', 500);
    }

    const file = createReadStream(fileLoc);
    const extension = extname(fileLoc);
    const fileName = basename(fileLoc, extension);
    res.header('Content-disposition', 'attachment; filename=' + fileName + extension);

    res.type(extension).send(file);
  }

  @Get('planner')
  async getPlanner(@Res() res: FastifyReply, @Query() query: { season: string }) {
    this.logger.debug('Generating planner');
    const result = await this.planner.getPlannerData(query.season);

    this.logger.debug(`Got ${Object.keys(result).length} clubs`);

    // Respond ok for now
    res.status(200).send(result);
  }

  @Get('notify-openrequests')
  async notifyOpenRequset(@User() user: Player, @Query() query: { season: string }) {
    // only allow this for me
    if (user.slug != 'glenn-latomme') {
      throw new UnauthorizedException('You do not have permission to do this');
    }

    let count = await Team.count({
      where: {
        season: query.season,
      },
    });

    // send mails to each team in bulk of 50
    while (count > 0) {
      const teams = await Team.findAll({
        where: {
          season: query.season,
        },
        limit: 50,
        offset: count,
        order: [['id', 'ASC']],
        include: [{ model: Player, as: 'captain' }],
      });

      for (const team of teams) {
        const encountersH = await team.getHomeEncounters({
          include: [{ model: EncounterChange }],
        });
        const encountersA = await team.getAwayEncounters({
          include: [{ model: EncounterChange }],
        });

        const validation: EncounterValidationOutput[] = [];
        for (const encounter of encountersH) {
          validation.push(
            await this.encounterValidationService.validate({
              encounterId: encounter.id,
            }),
          );
        }

        for (const encounter of encountersA) {
          validation.push(
            await this.encounterValidationService.validate({
              encounterId: encounter.id,
            }),
          );
        }

        this.mailingService.sendOpenRequestMail(
          {
            fullName: team.captain.fullName,
            email: team.email ?? team.captain.email,
            slug: team.slug,
          },
          encountersH.concat(encountersA),
          validation,
        );
      }

      count -= 50;
    }
  }
}
