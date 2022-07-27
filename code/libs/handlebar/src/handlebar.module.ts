import { Module } from '@nestjs/common';
import { HandlebarService } from './services';

@Module({
  providers: [HandlebarService],
  exports: [HandlebarService],
})
export class HandlebarModule {}
