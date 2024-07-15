import { MailingModule } from '@badman/backend-mailing';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService, PushService } from './services';
import { ChangeEncounterModule } from '@badman/backend-change-encounter';

@Module({
  imports: [MailingModule, ChangeEncounterModule, ConfigModule],
  providers: [NotificationService, PushService],
  exports: [NotificationService],
})
export class NotificationsModule {}
