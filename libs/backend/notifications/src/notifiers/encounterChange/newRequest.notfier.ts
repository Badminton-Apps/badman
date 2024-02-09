import {
  EncounterCompetition,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import { Notifier } from '../notifier.base';
import { RequestOptions } from 'web-push';
import { unitOfTime } from 'moment';

export class CompetitionEncounterChangeNewRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
  isHome: boolean;
}> {
  protected linkType = 'encounterCompetition';
  protected type: keyof NotificationOptionsTypes =
    'encounterChangeNewNotification';
  protected override allowedInterval: unitOfTime.Diff = 'hour';

  private readonly options = (encounter: EncounterCompetition) => {
    return {
      notification: {
        title: 'Nieuwe aanvraag',
        body: `Er is een nieuwe aanvraag voor de ontmoeting tussen ${encounter.home?.name} en ${encounter.away?.name} `,
      },
    } as RequestOptions;
  };

  async notifyPush(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition; isHome: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(
      player,
      this.options(data.encounter)
    );
  }

  async notifyEmail(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition; isHome: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
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

    await this.mailing.sendNewRequestMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data.encounter,
      data.isHome
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition; isHome: boolean },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
