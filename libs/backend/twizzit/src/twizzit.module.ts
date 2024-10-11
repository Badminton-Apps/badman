import { Module } from '@nestjs/common';
import { TwizzitController } from './controllers';
import { GameExportService, TwizzitService } from './services';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [TwizzitController],
  imports: [ConfigModule],
  providers: [GameExportService, TwizzitService],
  exports: [GameExportService, TwizzitService],
})
export class TwizzitModule {}
