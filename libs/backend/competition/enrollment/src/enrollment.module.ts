import { Module } from '@nestjs/common';
import { EnrollmentService } from './services';

@Module({
  controllers: [],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
