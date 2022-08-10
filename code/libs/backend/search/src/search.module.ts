import { Module } from '@nestjs/common';
import { SearchService } from './services';
import { SearchResolver } from './services';

@Module({
  controllers: [],
  providers: [SearchService, SearchResolver],
  exports: [],
})
export class SearchModule {}
