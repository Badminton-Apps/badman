import { DatabaseModule } from '@badman/backend/database';
import { HandlebarModule } from '@badman/backend/handlebar';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailingService } from './services';

@Module({
  imports: [HandlebarModule, DatabaseModule, ConfigModule],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
