import { SyncQueue } from '@badman/queue';
import { CpGeneratorService } from '@badman/api/generator';
import { InjectQueue } from '@nestjs/bull';
import {
  Controller,
  Get,
  Logger,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Queue } from 'bull';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { basename, extname } from 'path';
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectQueue(SyncQueue) private rankingQ: Queue,
    private cpGen: CpGeneratorService
  ) {}

  @Get('queue')
  getQueue() {
    this.logger.debug('Queue');
    return this.rankingQ.add('namedjob', 'data');
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
