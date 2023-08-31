import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CpGeneratorService, PlannerService } from './services';
import { EnrollmentModule } from '@badman/backend-enrollment';
import { TranslateModule } from '@badman/backend-translate';

@Module({
  imports: [EnrollmentModule, ConfigModule, TranslateModule],
  controllers: [],
  providers: [CpGeneratorService, PlannerService],
  exports: [CpGeneratorService, PlannerService],
})
export class GeneratorModule {}
