import {
  EventCompetition,
  EventTournament,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import * as webPush from 'web-push';
import { Notifier } from '../notifier.base';

export class EventSyncedFailedNotifier extends Notifier<
  {
    event: EventCompetition | EventTournament;
    success: boolean;
  },
  {
    email: string;
    slug: string;
  }
> {
  protected linkType = 'event';
  protected type: keyof NotificationOptionsTypes = 'syncSuccessNotification';

  private readonly options = (event: EventCompetition | EventTournament) => {
    const notification = {
      notification: {
        title: `${event.name} synchronisatie mislukt`,
        body: `${event.name} hebben we niet succesvol gesynchroniseerd`,
      },
    } as webPush.RequestOptions;

    return notification;
  };

  async notifyPush(
    player: Player,
    data: { event: EventCompetition | EventTournament; success: boolean }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(player, this.options(data.event));
  }
  async notifyEmail(
    player: Player,
    data: { event: EventCompetition | EventTournament; success: boolean },
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    const email = args?.email ?? player.email;
    if (!email) {
      this.logger.debug(`No email found for ${player.fullName}`);
      return;
    }

    if (!data?.event) {
      this.logger.debug(`No event found `);
      return;
    }

    if (!player?.slug) {
      this.logger.debug(`No slug found for ${player.fullName}`);
      return;
    }

    await this.mailing.sendSyncMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data?.event,
      false
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { event: EventCompetition | EventTournament; success: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
