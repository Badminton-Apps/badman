import { EncounterCompetition, Player } from '@badman/backend-database';
import { Notifier } from '../notifier.base';
import * as webPush from 'web-push';

export class CompetitionEncounterNotEnteredNotifier extends Notifier<
  {
    encounter: EncounterCompetition;
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = 'encounterCompetition';
  protected type = 'encounterNotEnteredNotification';

  private readonly options = (url: string, encounter: EncounterCompetition) => {
    return {
      notification: {
        title: 'Invullen uitslag',
        body: `Resultaat ${encounter.home.name} tegen ${encounter.away.name} nog niet ingevuld`,
        actions: [{ action: 'goto', title: 'Go naar wedstrijd' }],
        data: {
          onActionClick: {
            default: { operation: 'openWindow' },
            goto: {
              operation: 'openWindow',
              url,
            },
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

    const settings = await player.getSetting();

    for (const sub of settings.pushSubscriptions) {
      try {
        await webPush.sendNotification(
          sub,
          JSON.stringify(this.options(args.url, data.encounter))
        );
      } catch (error) {
        if (error.statusCode === 410) {
          // Remove unused subscription
          settings.pushSubscriptions = settings.pushSubscriptions.filter(
            (s) => s.endpoint !== sub.endpoint
          );
          settings.changed('pushSubscriptions', true);
          this.logger.debug(`Removed subscription for player ${player.fullName} (${sub.endpoint})`);
          await settings.save();
        } else {
          this.logger.error(error);
        }
      }
    }
  }

  async notifyEmail(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);

    await this.mailing.sendNotEnterdMail(
      {
        ...player,
        email: args.email ?? player.email,
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
    return null;
  }
}
