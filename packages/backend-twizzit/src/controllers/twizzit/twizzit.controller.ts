import { BadRequestException, Controller, Get, Logger, Query, Res } from "@nestjs/common";
import { GameExportService } from "../../services";
import * as XLSX from "xlsx";
import { FastifyReply } from "fastify";

@Controller("twizzit")
export class TwizzitController {
  private readonly logger = new Logger(TwizzitController.name);

  constructor(private readonly _export: GameExportService) {}

  @Get("games")
  async getTwizzitGames(
    @Res() response: FastifyReply,
    @Query() query: { year: number | string; clubId: string }
  ) {
    // Query parameters arrive as strings (no transform pipe in the app).
    if (!/^\d{4}$/.test(String(query.year ?? ""))) {
      throw new BadRequestException("year must be a four-digit season year");
    }
    const year = Number(query.year);

    const games = await this._export.gamesExport(year, query.clubId);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(games, {
      header: [
        "Game id",
        "Type",
        "Seizoen",
        "Datum",
        "Start tijdstip",
        "Eind tijdstip",
        "Tijdstip afspraak",
        "Thuisteam",
        "Uitteam",
        "Resource",
        "Part (%)",
        "Omschrijving",
        "Score",
        "Score details",
      ],
    });
    XLSX.utils.book_append_sheet(wb, ws, "Games");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    response.header("Content-Type", "text/csv");
    response.header("Content-Disposition", `attachment; filename="twizzit.xlsx"`);

    response.send(buffer);

    // buffer.pipe(response);
  }
}
