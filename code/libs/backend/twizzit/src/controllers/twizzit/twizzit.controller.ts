import { Controller, Get, Logger, Query } from '@nestjs/common';
import { GameExportService } from '../../services';

@Controller('twizzit')
export class TwizzitController {
  private readonly logger = new Logger(TwizzitController.name);

  constructor(private readonly _export: GameExportService) {}

  @Get('games')
  async getGames(@Query('year') year: number, @Query('clubId') clubId: string) {
    return this._export.getGames(year, clubId);
  }
}
