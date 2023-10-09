import { User } from '@badman/backend-authorization';
import { EncounterCompetition, Player } from '@badman/backend-database';
import { CpGeneratorService, PlannerService } from '@badman/backend-generator';
import { MailingService } from '@badman/backend-mailing';
import { NotificationService } from '@badman/backend-notifications';
import { SimulationQueue, SyncQueue } from '@badman/backend-queue';
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
    @InjectQueue(SimulationQueue) private rankingSim: Queue,
    @InjectQueue(SyncQueue) private rankingSync: Queue,
    private cpGen: CpGeneratorService,
    private notificationService: NotificationService,
    private planner: PlannerService,
    private mailService: MailingService,
  ) {}

  @Post('queue-job')
  async getQueueJob(
    @User() user: Player,
    @Body()
    args: {
      job: string;
      queue: typeof SimulationQueue | typeof SyncQueue;
      jobArgs: { [key: string]: unknown };
      removeOnComplete: boolean;
      removeOnFail: boolean;
    },
  ) {
    this.logger.debug({
      message: 'Queueing job',
      args: args.job,
      user: user?.toJSON(),
      hasPerm: await user.hasAnyPermission(['change:job']),
    });

    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new UnauthorizedException('You do not have permission to do this');
    }

    if (!args.jobArgs) {
      args.jobArgs = {};
    }

    // append the user id to the job args
    args.jobArgs['userId'] = user.id;

    switch (args.queue) {
      case SimulationQueue:
        return this.rankingSim.add(args.job, args.jobArgs, {
          removeOnComplete: args.removeOnComplete,
          removeOnFail: args.removeOnFail,
        });
      case SyncQueue:
        return this.rankingSync.add(args.job, args.jobArgs, {
          removeOnComplete: args.removeOnComplete,
          removeOnFail: args.removeOnFail,
        });
      default:
        throw new HttpException('Unknown queue', 500);
    }
  }

  @Get('cp')
  async getCp(@Res() res: FastifyReply, @Query() query: { eventId: string }) {
    this.logger.debug('Generating CP');
    try {
      const fileLoc = await this.cpGen.generateCpFile(query.eventId);
      if (!fileLoc) {
        throw new HttpException('Could not generate CP', 500);
      }

      const file = createReadStream(fileLoc);
      const extension = extname(fileLoc);
      const fileName = basename(fileLoc, extension);
      res.header(
        'Content-disposition',
        'attachment; filename=' + fileName + extension,
      );

      res.type(extension).send(file);
    } catch (e: any) {
      this.logger.error(e?.process?.message ?? e.message);
      throw e;
    }
  }

  @Get('planner')
  async getPlanner(
    @Res() res: FastifyReply,
    @Query() query: { season: string },
  ) {
    this.logger.debug('Generating planner');
    const result = await this.planner.getPlannerData(query.season);

    this.logger.debug(`Got ${Object.keys(result).length} clubs`);

    // Respond ok for now
    res.status(200).send(result);
  }

  @Get('error')
  async testError() {
    const url =
      'https://www.toernooi.nl/sport/teammatch.aspx?id=0131343E-0198-48F4-A75B-4995C6B9095F&match=478';
    const glenn = await Player.findOne({
      where: {
        slug: 'glenn-latomme',
      },
    });

    const encounter = await EncounterCompetition.findByPk(
      '81662379-702b-4a5f-8a28-8ee773a5915d',
    );

    if (!glenn) {
      this.logger.error(`Glenn not found`);
      return;
    }

    if (!encounter) {
      this.logger.error(`Encounter not found`);
      return;
    }

    await this.notificationService.notifySyncEncounterFailed(glenn.id, {
      url,
      encounter,
    });
  }
}
