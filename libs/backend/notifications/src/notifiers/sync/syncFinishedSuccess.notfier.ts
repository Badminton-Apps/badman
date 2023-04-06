import {
  EventCompetition,
  EventTournament,
  Player,
} from '@badman/backend-database';
import * as webPush from 'web-push';
import { Notifier } from '../notifier.base';
import { type unitOfTime } from 'moment';

export class EventSyncedSuccessNotifier extends Notifier<
  {
    event: EventCompetition | EventTournament;
    success: boolean;
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = 'event';
  protected type = 'syncSuccessNotification';
  protected override allowedInterval = 'minute' as unitOfTime.Diff;

  private readonly options = (
    event: EventCompetition | EventTournament,
    url: string
  ) => {
    return {
      notification: {
        title: `${event.name} succesvol gesynchroniseerd`,
        body: `${event.name} hebben we succesvol gesynchroniseerd`,
        actions: [{ action: 'goto', title: 'Ga naar event' }],
        data: {
          onActionClick: {
            default: { operation: 'openWindow', url: url },
            goto: { operation: 'openWindow', url: url },
          },
        },
      },
    } as webPush.RequestOptions;
  };

  async notifyPush(
    player: Player,
    data: { event: EventCompetition | EventTournament },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(
      player,
      this.options(data.event, args.url)
    );
  }
  async notifyEmail(
    player: Player,
    data: { event: EventCompetition | EventTournament },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);

    await this.mailing.sendSyncMail(
      {
        fullName: player.fullName,
        email: args.email ?? player.email,
        slug: player.slug,
      },
      data.event,
      true,
      args.url
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
    return null;
  }
}
