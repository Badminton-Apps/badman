import { MailingModule } from '@badman/backend-mailing';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationService } from './services';
import * as webPush from 'web-push'


@Module({
  imports: [MailingModule, ConfigModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {
  constructor(configSerice: ConfigService) {
    webPush.setVapidDetails(
      'mailto:info@badman.app',
      configSerice.get('VAPID_PUBLIC_KEY'),
      configSerice.get('VAPID_PRIVATE_KEY')
    );
  }
}
