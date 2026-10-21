import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { File, UploadGuard } from "@badman/backend-utils";
import { MultipartValue, MultipartFile } from "@fastify/multipart";
import {
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { FastifyReply } from "fastify";
import "multer";
import { LoansService } from "../services/loans.service.ts";
import { TransferService } from "../services/transfers.service";

@Controller({
  path: "competition/transfer-loan",
})
export class TransferLoanController {
  private readonly logger = new Logger(TransferLoanController.name);

  constructor(
    private readonly _transferService: TransferService,
    private readonly _loansService: LoansService
  ) {}

  @Post("process")
  @UseGuards(UploadGuard)
  async process(@User() user: Player, @File() file: MultipartFile, @Res() res: FastifyReply) {
    if (!user?.id) {
      throw new UnauthorizedException("Login required");
    }
    if (!(await user.hasAnyPermission(["change:transfer"]))) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const buffer = await file.toBuffer();
    const transferOrLoan = (file.fields["transferOrLoan"] as MultipartValue)?.value;
    const season = parseInt((file.fields["season"] as MultipartValue)?.value as string, 10);

    if (isNaN(season)) {
      this.logger.error(`Invalid season value: ${season}`);
      return res.send({ message: false });
    }

    if (transferOrLoan === "transfer") {
      await this._transferService.process(buffer, season);
    } else if (transferOrLoan === "loan") {
      await this._loansService.process(buffer, season);
    } else {
      this.logger.error(`Invalid transferOrLoan value: ${transferOrLoan}, ${season}`);
      return res.send({ message: false });
    }

    this.logger.debug("Done");
    return res.send({ message: true });
  }
}
