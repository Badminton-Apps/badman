import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CpGeneratorService } from './services/cp_generator';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [],
  providers: [CpGeneratorService],
  exports: [CpGeneratorService],
})
export class GeneratorModule {}
