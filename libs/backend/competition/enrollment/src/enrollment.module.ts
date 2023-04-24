import { Module } from '@nestjs/common';
import { EnrollmentValidationService } from './services';

@Module({
  controllers: [],
  providers: [EnrollmentValidationService],
  exports: [EnrollmentValidationService],
})
export class EnrollmentModule {}
