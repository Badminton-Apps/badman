import { Module } from '@nestjs/common';
import { CpGeneratorService } from './services/cp_generator';

@Module({
  controllers: [CpGeneratorService],
  providers: [],
  exports: [],
})
export class GeneratorModule {}