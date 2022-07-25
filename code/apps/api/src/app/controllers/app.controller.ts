import { CpGeneratorService } from '@badman/api/generator';
import { SimulationQueue, Sync, SyncQueue } from '@badman/queue';
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

  @Get('queue-sync')
  getQueueSync(@Query() { date }: { date: string }) {
    return this.rankingSync.add(
      Sync.SyncEvents,
      { date },
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
