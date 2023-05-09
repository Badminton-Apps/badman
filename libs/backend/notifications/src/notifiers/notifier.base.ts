import { Player, Notification } from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { NotificationType } from '@badman/utils';
import { Logger } from '@nestjs/common';
import { PushService } from '../services';
import { unitOfTime } from 'moment';
import moment from 'moment';

export abstract class Notifier<T, A = { email: string }> {
  protected readonly logger = new Logger(Notifier.name);
  protected abstract type: string;
  protected abstract linkType: string;
  protected allowedInterval: unitOfTime.Diff = 'day';

  constructor(
    protected mailing: MailingService,
    protected pushService: PushService
  ) {}

  abstract notifyPush(player: Player, data: T, args?: A): Promise<void>;
  abstract notifyEmail(player: Player, data: T, args?: A): Promise<void>;
  abstract notifySms(player: Player, data: T, args?: A): Promise<void>;

  async notify(
    player: Player,
    linkId: string,
    data: T,
    args?: A,
    force?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    }
  ): Promise<void> {
    if (!player) {
      this.logger.warn(`Player not found`);
      return;
    }
    const settings = await player.getSetting();
    const type = settings?.[this.type] as NotificationType;

    if (!type || !force) {
      this.logger.debug(
        `Notification ${this.type} disabled for ${player.fullName}`
      );
      return;
    }

    const notification = await Notification.findOne({
      where: {
        sendToId: player.id,
        linkId,
        linkType: this.linkType,
        type: this.type,
      },
    });

    if (notification) {
      const lastSend = moment(notification.createdAt);
      if (moment().diff(lastSend, this.allowedInterval) < 1) {
        this.logger.debug(
          `Notification already sent to ${player.fullName} in the last ${
            this.allowedInterval
          } (send on: ${lastSend.format('DD-MM-YYYY HH:mm:ss')})`
        );
        return;
      }
    }

    this.logger.debug(`Sending notification to ${player.fullName} (${type})`);

    if (type & NotificationType.PUSH || force?.push) {
      await this.notifyPush(player, data, args);
    }

    if (type & NotificationType.EMAIL || force?.email) {
      await this.notifyEmail(player, data, args);
    }

    if (type & NotificationType.SMS || force?.sms) {
      await this.notifySms(player, data, args);
    }

    // Create notification once
    const notif = new Notification({
      sendToId: player.id,
      linkId,
      linkType: this.linkType,
      type: this.type,
    });

    await notif.save();
  }
}
