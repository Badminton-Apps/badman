import { MailingModule } from '@badman/backend-mailing';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService, PushService } from './services';

@Module({
  imports: [MailingModule, ConfigModule],
  providers: [NotificationService, PushService],
  exports: [NotificationService],
})
export class NotificationsModule {}
