import { Module } from '@nestjs/common';
import { ValidationService } from './services';

@Module({
  controllers: [],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class EnrollmentModule {}
