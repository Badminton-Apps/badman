import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { IsUUID } from "@badman/utils";
import { toCSV, toXlsx } from "@badman/backend-utils";
import { FastifyReply } from "fastify";
import { TeamsService } from "../services/export/teams.service";

export type ExportFormat = "xlsx" | "csv";
const VALID_FORMATS: ExportFormat[] = ["xlsx", "csv"];

@Controller({ path: "export" })
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly teamsService: TeamsService) {}

  @Get("teams")
  async getTeams(
    @User() user: Player,
    @Res() res: FastifyReply,
    @Query() query: { eventId: string; format: ExportFormat }
  ) {
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["edit:competition"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const format: ExportFormat = query.format ?? "xlsx";
    if (!VALID_FORMATS.includes(format)) {
      throw new BadRequestException(`format must be one of: ${VALID_FORMATS.join(", ")}`);
    }

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    this.logger.debug(`Generating teams export [${format}]`);
    const { headers, rows, eventName } = await this.teamsService.getTeams(query.eventId);

    switch (format) {
      case "csv": {
        const csv = toCSV(headers, rows);
        res.header("Content-Disposition", `attachment; filename="${eventName}.csv"`);
        res.header("Content-Type", "text/csv; charset=utf-8");
        res.send(csv);
        break;
      }
      case "xlsx": {
        const buffer = toXlsx("Teams", headers, rows);
        res.header("Content-Disposition", `attachment; filename="${eventName}.xlsx"`);
        res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);
        break;
      }
    }

    this.logger.debug("Done");
  }
}
