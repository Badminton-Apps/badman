import {
  EncounterCompetition,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import * as webPush from 'web-push';
import { Notifier } from '../notifier.base';

export class CompetitionEncounterNotAcceptedNotifier extends Notifier<
  {
    encounter: EncounterCompetition;
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = 'encounterCompetition';
  protected type: keyof NotificationOptionsTypes =
    'encounterNotEnteredNotification';
  protected allowedAmount = 1;

  private readonly options = (url: string, encounter: EncounterCompetition) => {
    return {
      notification: {
        title: 'Accepteren uitslag',
        body: `Resultaat ${encounter.home?.name} tegen ${encounter.away?.name} nog niet geaccepteerd`,
        actions: [{ action: 'goto', title: 'Ga naar wedstrijd' }],
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
    data: { encounter: EncounterCompetition },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);

    if (!args?.url) {
      throw new Error('No url provided');
    }

    await this.pushService.sendNotification(
      player,
      this.options(args?.url, data.encounter)
    );
  }
  async notifyEmail(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);

    const email = args?.email ?? player.email;
    if (!email) {
      this.logger.debug(`No email found for ${player.fullName}`);
      return;
    }

    if (!player?.slug) {
      this.logger.debug(`No slug found for ${player.fullName}`);
      return;
    }

    if (!args?.url) {
      throw new Error('No url provided');
    }

    await this.mailing.sendNotAcceptedMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data.encounter,
      args.url
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
