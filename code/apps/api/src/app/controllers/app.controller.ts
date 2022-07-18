import { Game } from '@badman/api/database';
import { CpGeneratorService } from '@badman/api/generator';
import { Simulation, SimulationQueue, Sync, SyncQueue } from '@badman/queue';
import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { Queue } from 'bull';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { basename, extname } from 'path';
import { EventsGateway } from '../events';
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
    // BVL 25w 75up 35down
    this.rankingSim.add(
      Simulation.Start,
      {
        systemIds: ['98d5aeee-973e-4bdb-8087-290e480df53f'],
        stop: '2022-07-03 22:00:00+00',
      },
      {
        removeOnComplete: true,
      } 
    );

    // // BVL 25w 67up 30down
    // this.rankingSim.add(Simulation.Start, {
    //   systemIds: ['c1c7e8e2-5d1b-42d7-a109-a249884c0b13'],
    //   stop: '2022-07-03 22:00:00+00',
    // }, {
    //   removeOnComplete: true
    // });

    // // BVL 25w 75up 35down
    // this.rankingSim.add(Simulation.Start, {
    //   systemIds: ['b91cbdc1-85b0-4065-9039-f3e90e210979'],
    //   stop: '2022-07-03 22:00:00+00',
    // }, {
    //   removeOnComplete: true
    // });
  }

  @Get('queue-sync')
  getQueueSync() {
    this.logger.debug('Queue');
    return this.rankingSync.add(
      Sync.SyncEvents,
      { date: '2022-07-14', only: ['Vlaamse interclubcompetitie 2022-2023'] },
      { removeOnComplete: true }
    );
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
