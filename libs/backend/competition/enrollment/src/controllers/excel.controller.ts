import {
  Controller,
  Get,
  HttpException,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { basename, extname } from 'path';
import { ExcelService } from '../services/excel.services';

@Controller({
  path: 'excel/enrollment',
})
export class EnrollemntController {
  private readonly logger = new Logger(EnrollemntController.name);

  constructor(private readonly excelService: ExcelService) {}

  @Get()
  async getBaseplayersEnrollment(
    @Res() res: FastifyReply,
    @Query() query: { eventId: string },
  ) {
    this.logger.debug('Generating excel');
    const { buffer, event } = await this.excelService.GetEnrollment(
      query.eventId,
    );
    if (!buffer) {
      throw new HttpException('Could not generate CP', 500);
    }

    // send the excel buffer to the res

    res.header(
      'Content-Disposition',
      `attachment; filename=${basename(
        `${event?.name}.xlsx`,
        extname(`${event?.name}.xlsx`),
      )}`,
    );
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
    this.logger.debug('Done');
  }
}
