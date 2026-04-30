import { Module } from "@nestjs/common";
import { EnrollmentValidationService } from "./services";
import { EnrollmentController } from "./controllers/excel.controller";
import { ExcelService } from "./services/excel.services";

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentValidationService, ExcelService],
  exports: [EnrollmentValidationService],
})
export class EnrollmentModule {}
