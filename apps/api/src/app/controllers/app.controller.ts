import { User } from '@badman/backend-authorization';
import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
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
import { Response } from 'express';
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
    private mailService: MailingService
  ) {}

  @Post('queue-job')
  async getQueueJob(
    @User() user: Player,
    @Body()
    args: {
      job: string;
      queue: typeof SimulationQueue | typeof SyncQueue;
      jobArgs: unknown;
      removeOnComplete: boolean;
      removeOnFail: boolean;
    }
  ) {
    this.logger.debug({
      message: 'Queueing job',
      args: args.job,
      user: user?.toJSON(),
      hasPerm: user.hasAnyPermission(['change:job']),
    });

    if (!user.hasAnyPermission(['change:job'])) {
      throw new UnauthorizedException('You do not have permission to do this');
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
  async getCp(@Res() res: Response, @Query() query: { eventId: string }) {
    this.logger.debug('Generating CP');
    try {
      const fileLoc = await this.cpGen.generateCpFile(query.eventId);
      const file = createReadStream(fileLoc);
      const extension = extname(fileLoc);
      const fileName = basename(fileLoc, extension);
      res.setHeader(
        'Content-disposition',
        'attachment; filename=' + fileName + extension
      );

      file.pipe(res);
    } catch (e) {
      this.logger.error(e?.process?.message ?? e.message);
      throw e;
    }
  }

  @Get('planner')
  async getPlanner(@Res() res: Response, @Query() query: { season: string }) {
    this.logger.debug('Generating planner');
    const result = await this.planner.getPlannerData(query.season);

    this.logger.debug(`Got ${Object.keys(result).length} clubs`);

    // Respond ok for now
    res.status(200).send(result);
  }

  @Get('test-glenn')
  async test(@User() user: Player, @Res() res: Response) {
    if (!user.hasAnyPermission(['change:job'])) {
      throw new UnauthorizedException('You do not have permission to do this');
    }

    const encounter = await EncounterCompetition.findByPk(
      'b89fc82b-2322-4330-8599-9a26d7607b1c',
      {
        attributes: ['id', 'visualCode', 'date', 'homeTeamId', 'awayTeamId'],
        include: [
          {
            model: Team,
            as: 'home',
            attributes: ['id', 'name'],
          },
          {
            model: Team,
            as: 'away',
            attributes: ['id', 'name'],
          },
          {
            required: true,
            attributes: ['id'],
            model: DrawCompetition,
            include: [
              {
                required: true,
                attributes: ['id'],
                model: SubEventCompetition,
                include: [
                  {
                    required: true,
                    attributes: ['id', 'visualCode'],
                    model: EventCompetition,
                    where: {
                      checkEncounterForFilledIn: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      }
    );

    await this.notificationService.notifyEncounterNotEntered(encounter);

    // Respond ok for now
    res.status(200).send();
  }

  @Get('test')
  async getInlinePdf() {
    await this.mailService.sendTestMail();
  }
}
