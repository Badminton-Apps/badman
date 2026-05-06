import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Logger,
  NotFoundException,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { User } from "@badman/backend-authorization";
import { EventCompetition, Player } from "@badman/backend-database";
import { IsUUID } from "@badman/utils";
import { FastifyReply } from "fastify";
import { basename, extname } from "path";
import { ExcelService } from "../services/excel.services";

@Controller({
  path: "excel/enrollment",
})
export class EnrollmentController {
  private readonly logger = new Logger(EnrollmentController.name);

  constructor(private readonly excelService: ExcelService) {}

  @Get()
  async getBaseplayersEnrollment(
    @User() user: Player,
    @Res() res: FastifyReply,
    @Query() query: { eventId: string }
  ) {
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["edit:competition"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }

    if (!query.eventId || !IsUUID(query.eventId)) {
      throw new BadRequestException("eventId must be a valid UUID");
    }
    const event = await EventCompetition.findByPk(query.eventId);
    if (!event) {
      throw new NotFoundException(`Competition ${query.eventId} not found`);
    }

    this.logger.debug("Generating excel");
    const { buffer } = await this.excelService.GetEnrollment(query.eventId);
    if (!buffer) {
      throw new HttpException("Could not generate excel", 500);
    }

    res.header(
      "Content-Disposition",
      `attachment; filename=${basename(`${event.name}.xlsx`, extname(`${event.name}.xlsx`))}`
    );
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
    this.logger.debug("Done");
  }
}
