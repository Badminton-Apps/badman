import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VisualService } from './services';
import { CacheModule } from '@badman/backend-cache';

@Module({
  imports: [CacheModule, ConfigModule],
  providers: [VisualService],
  exports: [VisualService],
})
export class VisualModule {}
