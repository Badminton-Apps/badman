import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CpGeneratorService, PlannerService } from './services';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [],
  providers: [CpGeneratorService, PlannerService],
  exports: [CpGeneratorService, PlannerService],
})
export class GeneratorModule {}
