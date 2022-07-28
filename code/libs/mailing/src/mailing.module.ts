import { DatabaseModule } from '@badman/api/database';
import { HandlebarModule } from '@badman/handlebar';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailingService } from './services';

@Module({
  imports: [HandlebarModule, DatabaseModule, ConfigModule],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
