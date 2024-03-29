import { Player } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pkg from 'web-push';
import { RequestOptions, WebPushError } from 'web-push';
const { setVapidDetails, sendNotification } = pkg;
import { ConfigType } from '@badman/utils';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private isPushEnabled = false;

  constructor(configService: ConfigService<ConfigType>) {
    const publicVapidKey = configService.get('VAPID_PUBLIC_KEY');
    const privateVapidKey = configService.get('VAPID_PRIVATE_KEY');
    const pushEnabledKey = configService.get<boolean>('PUSH_ENABLED');

    if (publicVapidKey && privateVapidKey && pushEnabledKey) {
      setVapidDetails('mailto:info@badman.app', publicVapidKey, privateVapidKey);
      this.isPushEnabled = true;

      this.logger.debug('Push notifications enabled');
    }
  }

  async sendNotification(player?: Player, data?: RequestOptions) {
    if (!this.isPushEnabled) {
      this.logger.debug('Push notifications are not enabled');
      return;
    }

    const settings = await player?.getSetting();

    if (!settings) {
      this.logger.warn(`Player ${player?.fullName} has no settings`);
      return;
    }

    for (const sub of settings.pushSubscriptions) {
      try {
        await sendNotification(sub, JSON.stringify(data));
        this.logger.debug(`Sent push notification to ${sub.endpoint}`);
      } catch (error) {
        if (error instanceof WebPushError && error.statusCode === 410) {
          // Remove unused subscription
          settings.pushSubscriptions = settings.pushSubscriptions.filter(
            (s) => s.endpoint !== sub.endpoint,
          );
          settings.changed('pushSubscriptions', true);
          this.logger.debug(
            `Removed subscription for player ${player?.fullName} (${sub.endpoint})`,
          );
          await settings.save();
        } else {
          this.logger.error(error);
        }
      }
    }
  }
}
