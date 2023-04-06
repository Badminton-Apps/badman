import { Module } from '@nestjs/common';
import { TwizzitController } from './controllers';
import { GameExportService } from './services';

@Module({
  controllers: [TwizzitController],
  providers: [GameExportService],
  exports: [GameExportService],
})
export class TwizzitModule {}
