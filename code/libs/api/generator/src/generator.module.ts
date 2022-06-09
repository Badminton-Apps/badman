import { Module } from '@nestjs/common';
import { CpGeneratorService } from './services/cp_generator';

@Module({
  controllers: [],
  providers: [CpGeneratorService],
  exports: [],
})
export class GeneratorModule {}