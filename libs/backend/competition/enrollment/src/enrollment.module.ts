import { Module } from "@nestjs/common";
import { EnrollmentValidationService } from "./services";
import { EnrollmentController } from "./controllers/excel.controller";
import { ExcelService } from "./services/excel.services";
import { IndexCalculationService } from "./services/index-calculation/index-calculation.service";

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentValidationService, ExcelService, IndexCalculationService],
  exports: [EnrollmentValidationService, IndexCalculationService],
})
export class EnrollmentModule {}
