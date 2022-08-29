import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VisualService } from './services';

@Module({
  imports: [ConfigModule],
  providers: [VisualService],
  exports: [VisualService],
})
export class VisualModule {}
