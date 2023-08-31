import { I18nTranslations } from '@badman/utils';
import {
  Res,
  Query,
  HttpException,
  Controller,
  Logger,
  Get,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { createReadStream } from 'fs';
import { basename, extname } from 'path';
import { FastifyReply } from 'fastify';
import { ExcelService } from '../services/excel.services';

@Controller({
  path: 'excel/enrollment',
})
export class EnrollemntController {
  private readonly logger = new Logger(EnrollemntController.name);

  constructor(
    private readonly i18nService: I18nService<I18nTranslations>,
    private readonly excelService: ExcelService
  ) {}

  @Get()
  async getBaseplayersEnrollment(
    @Res() res: FastifyReply,
    @Query() query: { eventId: string }
  ) {
    this.logger.debug('Generating excel');
    try {
      const { buffer, event } = await this.excelService.GetEnrollment(
        query.eventId
      );
      if (!buffer) {
        throw new HttpException('Could not generate CP', 500);
      }

      // send the excel buffer to the res

      res.header(
        'Content-Disposition',
        `attachment; filename=${basename(
          `${event?.name}.xlsx`,
          extname(`${event?.name}.xlsx`)
        )}`
      );
      res.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
      this.logger.debug('Done');
    } catch (e: any) {
      this.logger.error(e?.process?.message ?? e.message);
      throw e;
    }
  }
}
