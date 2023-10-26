import { Module } from '@nestjs/common';
import { SearchService } from './services';
import { SearchResolver } from './services';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [SearchService, SearchResolver],
  exports: [SearchService],
})
export class SearchModule {}
