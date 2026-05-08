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
import { EnrollmentService } from "../services/export/enrollment.service";
import { ExceptionsService } from "../services/export/exceptions.service";
import { LocationsService } from "../services/export/locations.service";
import { TeamsService } from "../services/export/teams.service";

export type ExportFormat = "xlsx" | "csv";
const VALID_FORMATS: ExportFormat[] = ["xlsx", "csv"];

function getExportFormat(query: { format: ExportFormat }): ExportFormat {
  const format: ExportFormat = query.format ?? "xlsx";
  if (!VALID_FORMATS.includes(format)) {
    throw new BadRequestException(`format must be one of: ${VALID_FORMATS.join(", ")}`);
  }
  return format;
}

function buildExportPayload({
  format,
  sheetName,
  headers,
  rows,
}: {
  format: ExportFormat;
  sheetName: string;
  headers: readonly string[];
  rows: (string | number | undefined | null)[][];
}): { payload: string | Buffer; extension: ExportFormat; contentType: string } {
  switch (format) {
    case "csv": {
      return {
        payload: toCSV(headers, rows),
        extension: "csv",
        contentType: "text/csv; charset=utf-8",
      };
    }
    case "xlsx": {
      return {
        payload: toXlsx(sheetName, headers, rows),
        extension: "xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }
  }
}

@Controller({ path: "export" })
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(
    private readonly teamsService: TeamsService,
    private readonly exceptionsService: ExceptionsService,
    private readonly locationsService: LocationsService,
    private readonly enrollmentService: EnrollmentService
  ) {}

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

    const format = getExportFormat(query);

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    this.logger.debug(`Generating teams export [${format}]`);
    const { headers, rows, eventName } = await this.teamsService.getTeams(query.eventId);

    const { payload, extension, contentType } = buildExportPayload({
      format,
      sheetName: "Teams",
      headers,
      rows,
    });
    res.header("Content-Disposition", `attachment; filename="${eventName}.${extension}"`);
    res.header("Content-Type", contentType);
    res.send(payload);

    this.logger.debug("Done");
  }

  @Get("exceptions")
  async getExceptions(
    @User() user: Player,
    @Res() res: FastifyReply,
    @Query() query: { eventId: string; format: ExportFormat }
  ) {
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["export-exceptions:competition"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const format = getExportFormat(query);

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    this.logger.debug(`Generating exceptions export [${format}]`);
    const { headers, rows, eventName } = await this.exceptionsService.getExceptions(query.eventId);

    const { payload, extension, contentType } = buildExportPayload({
      format,
      sheetName: "Exceptions",
      headers,
      rows,
    });
    res.header(
      "Content-Disposition",
      `attachment; filename="${eventName}-exceptions.${extension}"`
    );
    res.header("Content-Type", contentType);
    res.send(payload);

    this.logger.debug("Done");
  }

  @Get("locations")
  async getLocations(
    @User() user: Player,
    @Res() res: FastifyReply,
    @Query() query: { eventId: string; format: ExportFormat }
  ) {
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["export-locations:competition"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const format = getExportFormat(query);

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    this.logger.debug(`Generating locations export [${format}]`);
    const { headers, rows, eventName } = await this.locationsService.getLocations(query.eventId);

    const { payload, extension, contentType } = buildExportPayload({
      format,
      sheetName: "Locations",
      headers,
      rows,
    });
    res.header("Content-Disposition", `attachment; filename="${eventName}-locations.${extension}"`);
    res.header("Content-Type", contentType);
    res.send(payload);

    this.logger.debug("Done");
  }

  @Get("enrollment")
  async getEnrollment(
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

    const format = getExportFormat(query);

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }

    this.logger.debug(`Generating enrollment export [${format}]`);
    const { headers, rows, eventName } = await this.enrollmentService.getEnrollment(query.eventId);

    const { payload, extension, contentType } = buildExportPayload({
      format,
      sheetName: "Enrollment",
      headers,
      rows,
    });
    res.header(
      "Content-Disposition",
      `attachment; filename="${eventName}-enrollment.${extension}"`
    );
    res.header("Content-Type", contentType);
    res.send(payload);

    this.logger.debug("Done");
  }
}
