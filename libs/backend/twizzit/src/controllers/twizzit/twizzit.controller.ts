import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { GameExportService } from '../../services';
import * as XLSX from 'xlsx';
import { FastifyReply } from 'fastify';

@Controller('twizzit')
export class TwizzitController {
  private readonly logger = new Logger(TwizzitController.name);

  constructor(private readonly _export: GameExportService) {}

  @Get('games')
  async getTwizzitGames(
    @Res() response: FastifyReply,
    @Query() query: { year: number; clubId: string },
  ) {
    const games = await this._export.gamesExport(query.year, query.clubId);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(games, {
      header: [
        'Game id',
        'Type',
        'Seizoen',
        'Datum',
        'Start tijdstip',
        'Eind tijdstip',
        'Tijdstip afspraak',
        'Thuisteam',
        'Uitteam',
        'Resource',
        'Part (%)',
        'Omschrijving',
        'Score',
        'Score details',
      ],
    });
    XLSX.utils.book_append_sheet(wb, ws, 'Games');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    response.header('Content-Type', 'text/csv');
    response.header('Content-Disposition', `attachment; filename="twizzit.xlsx"`);

    response.send(buffer);

    // buffer.pipe(response);
  }
}
