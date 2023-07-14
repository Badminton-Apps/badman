import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AssemblyExportService } from '../services';

@Controller({
  path: 'assembly',
})
export class AssemblyExportController {
  private readonly logger = new Logger(AssemblyExportController.name);

  constructor(private readonly _export: AssemblyExportService) {}

  @Get('export')
  async getExportAssembly(
    @Res() response: FastifyReply,
    @Query() query: { season: number; clubId: string }
  ) {
    if (!query.clubId || !query.season) {
      throw new Error('Missing query params');
    }

    const buffer = await this._export.export(query.clubId, query.season);

    response.header('Content-Type', 'text/csv');
    response.header(
      'Content-Disposition',
      `attachment; filename="assembly-export.xlsx"`
    );

    response.send(buffer);
  }
}
