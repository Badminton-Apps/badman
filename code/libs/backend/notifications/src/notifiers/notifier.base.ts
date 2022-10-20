import {
  NotificationType,
  Player,
  Notification,
} from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { Logger } from '@nestjs/common';

export abstract class Notifier<T, A = { email: string }> {
  protected readonly logger = new Logger(Notifier.name);
  protected abstract type: string;
  protected abstract linkType: string;

  constructor(protected mailing: MailingService){}

  abstract notifyPush(player: Player, data: T, args?: A): Promise<void>;
  abstract notifyEmail(player: Player, data: T, args?: A): Promise<void>;
  abstract notifySms(player: Player, data: T, args?: A): Promise<void>;

  async notify(
    player: Player,
    linkId: string, 
    data: T,
    args?: A
  ): Promise<void> {
    const settings = await player.getSetting();
    const type = settings[this.type] as NotificationType;
 
    const notification = await Notification.findOne({ 
      where: { 
        sendToId: player.id,
        linkId,
        linkType: this.linkType,
        type: this.type,
      },
    }); 

    if (notification) {
      return;
    }

    if (type & NotificationType.PUSH) {
      await this.notifyPush(player, data, args);
    }

    if (type & NotificationType.EMAIL) {
      await this.notifyEmail(player, data, args);
    }

    if (type & NotificationType.SMS) {
      await this.notifySms(player, data, args);
    }

    return;
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
