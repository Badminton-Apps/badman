import { DatabaseModule } from '@badman/api/database';
import { HandlebarModule } from '@badman/handlebar';
import { Module } from '@nestjs/common';
import { MailingService } from './services';

@Module({
  imports: [HandlebarModule, DatabaseModule],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
