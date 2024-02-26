import { Player, Notification, NotificationOptionsTypes } from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { NotificationType } from '@badman/utils';
import { Logger } from '@nestjs/common';
import { PushService } from '../services';
import { unitOfTime } from 'moment';
import moment from 'moment';

export abstract class Notifier<T, A = { email: string }> {
  protected readonly logger = new Logger(Notifier.name);
  protected abstract type: keyof NotificationOptionsTypes;
  protected abstract linkType: string;
  protected allowedInterval: unitOfTime.Diff = 'day';
  protected allowedIntervalUnit = 1;
  protected allowedAmount?: number = undefined;

  constructor(
    protected mailing: MailingService,
    protected pushService: PushService,
  ) {}

  abstract notifyPush(player: Player, data?: T, args?: A): Promise<void>;
  abstract notifyEmail(player: Player, data?: T, args?: A): Promise<void>;
  abstract notifySms(player: Player, data?: T, args?: A): Promise<void>;

  async notify(
    player?: Player,
    linkId?: string,
    data?: T,
    args?: A,
    force?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    },
  ): Promise<void> {
    if (!player) {
      this.logger.warn(`Player not found`);
      return;
    }
    const settings = await player?.getSetting();

    if (!settings) {
      this.logger.warn(`Player ${player.fullName} has no settings`);
      return;
    }

    const type = settings?.[this.type] as NotificationType;

    if (!type && !force) {
      this.logger.debug(`Notification ${this.type} disabled for ${player.fullName}`);
      return;
    }

    const notification = await Notification.findOne({
      where: {
        sendToId: player.id,
        linkId,
        linkType: this.linkType,
        type: this.type,
      },
      order: [['createdAt', 'DESC']],
    });
    const totalAmount = await Notification.count({
      where: {
        sendToId: player.id,
        linkId,
        linkType: this.linkType,
        type: this.type,
      },
    });

    if (notification) {
      const lastSend = moment(notification.createdAt);
      if (moment().diff(lastSend, this.allowedInterval) < this.allowedIntervalUnit) {
        this.logger.debug(
          `Notification already sent to ${player.fullName} in the last ${
            this.allowedInterval
          } (send on: ${lastSend.format('DD-MM-YYYY HH:mm:ss')})`,
        );
        return;
      }

      if (this.allowedAmount && totalAmount >= this.allowedAmount) {
        this.logger.debug(
          `Notification already sent to ${player.fullName} enough (${totalAmount}) times`,
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
