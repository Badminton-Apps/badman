import { Module } from '@nestjs/common';
import { MailingService } from './services';

@Module({
  imports: [HandlebarModule],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
