import {
  EventCompetition,
  EventTournament,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import { RequestOptions } from 'web-push';
import { Notifier } from '../notifier.base';
import { type unitOfTime } from 'moment';

export class EventSyncedSuccessNotifier extends Notifier<
  {
    event?: EventCompetition | EventTournament;
    success: boolean;
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = 'event';
  protected type: keyof NotificationOptionsTypes = 'syncSuccessNotification';
  protected override allowedInterval = 'minute' as unitOfTime.Diff;

  private readonly options = (event?: EventCompetition | EventTournament, url?: string) => {
    let title = 'Synchronisatie succesvol';
    let body = 'Synchronisatie succesvol';
    let actions: { action: string; title: string }[] = [];
    let data: unknown = {};
    if (event) {
      title = `${event.name} succesvol gesynchroniseerd`;
      body = `${event.name} hebben we succesvol gesynchroniseerd`;
      actions = [{ action: 'goto', title: 'Ga naar event' }];
      data = {
        onActionClick: {
          default: { operation: 'openWindow', url: url },
          goto: { operation: 'openWindow', url: url },
        },
      };
    }

    return {
      notification: {
        title,
        body,
        actions,
        data,
      },
    } as RequestOptions;
  };

  async notifyPush(
    player: Player,
    data?:
      | {
          event?: EventCompetition | EventTournament;
          success: boolean;
        }
      | undefined,
    args?: { email: string; url: string } | undefined,
  ) {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(player, this.options(data?.event, args?.url));
  }

  async notifyEmail(
    player: Player,
    data?:
      | {
          event?: EventCompetition | EventTournament;
          success: boolean;
        }
      | undefined,
    args?: { email: string; url: string } | undefined,
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
      true,
      args?.url,
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { event: EventCompetition | EventTournament; success: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string },
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
