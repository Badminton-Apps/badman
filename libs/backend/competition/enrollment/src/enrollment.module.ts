import { Module } from '@nestjs/common';
import { EnrollmentValidationService } from './services';
import { EnrollemntController } from './controllers/excel.controller';
import { ExcelService } from './services/excel.services';

@Module({
  controllers: [EnrollemntController],
  providers: [EnrollmentValidationService, ExcelService],
  exports: [EnrollmentValidationService],
})
export class EnrollmentModule {}
 