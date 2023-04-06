import { Player } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private isPushEnabled = false;

  constructor(configSerice: ConfigService) {
    if (
      configSerice.get('VAPID_PUBLIC_KEY') &&
      configSerice.get('VAPID_PRIVATE_KEY')
    ) {
      webPush.setVapidDetails(
        'mailto:info@badman.app',
        configSerice.get('VAPID_PUBLIC_KEY'),
        configSerice.get('VAPID_PRIVATE_KEY')
      );
      this.isPushEnabled = true;
    }
  }

  async sendNotification(player: Player, data: webPush.RequestOptions) {
    if (!this.isPushEnabled) {
      return;
    }

    const settings = await player.getSetting();

    for (const sub of settings.pushSubscriptions) {
      try {
        await webPush.sendNotification(sub, JSON.stringify(data));
        this.logger.debug(`Sent push notification to ${sub.endpoint}`);
      } catch (error) {
        if (error.statusCode === 410) {
          // Remove unused subscription
          settings.pushSubscriptions = settings.pushSubscriptions.filter(
            (s) => s.endpoint !== sub.endpoint
          );
          settings.changed('pushSubscriptions', true);
          this.logger.debug(
            `Removed subscription for player ${player.fullName} (${sub.endpoint})`
          );
          await settings.save();
        } else {
          this.logger.error(error);
        }
      }
    }
  }
}
