import {
  Ranking,
  SyncQueue,
  Simulation,
  SimulationQueue,
  Sync,
} from '@badman/queue';
import { CpGeneratorService } from '@badman/api/generator';
import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { Queue } from 'bull';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { basename, extname } from 'path';
import { EventsGateway } from '../events';
import { Game } from '@badman/api/database';
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectQueue(SimulationQueue) private rankingSim: Queue,
    @InjectQueue(SyncQueue) private rankingSync: Queue,
    private gateway: EventsGateway,
    private cpGen: CpGeneratorService
  ) {}

  @Get('event')
  async socketTest(): Promise<string> {
    const game = await Game.findByPk('ea427354-39ed-462c-ae00-dc0cc2dacd3e');
    game.set1Team1 = 99;
    this.gateway.server.emit('game:game_updated', game.toJSON());
    return 'Hello World!';
  }

  @Get('queue-sim')
  getQueueSim() {
    this.logger.debug('Queue');
    // // 20 Games
    // this.rankingSim.add(Simulation.Start, {
    //   systemIds: ['ee720b52-cdd6-4bbe-bf19-976a3750cda3'],
    //   stop: '2022-07-03 22:00:00+00',
    // });

    // 25 Games
    this.rankingSim.add(Simulation.Start, {
      systemIds: ['1a69c5a8-7c72-47fe-8646-3018a7c53a5a'],
      stop: '2022-07-03 22:00:00+00',
    });

    // // All Games
    // this.rankingSim.add(Simulation.Start, {
    //   systemIds: ['bdb91081-3549-49d9-9ac9-67a4c1320977'],
    //   stop: '2022-07-03 22:00:00+00',
    // });
  }

  @Get('queue-sync')
  getQueueSync() {
    this.logger.debug('Queue');
    return this.rankingSync.add(Sync.SyncEvents);
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
}
