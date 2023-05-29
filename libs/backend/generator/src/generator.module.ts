import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CpGeneratorService, PlannerService } from './services';
import { EnrollmentModule } from '@badman/backend-enrollment';

@Module({
  imports: [EnrollmentModule, ConfigModule],
  controllers: [],
  providers: [CpGeneratorService, PlannerService],
  exports: [CpGeneratorService, PlannerService],
})
export class GeneratorModule {}
