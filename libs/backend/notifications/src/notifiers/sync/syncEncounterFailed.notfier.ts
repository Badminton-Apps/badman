import {
  EncounterCompetition,
  NotificationOptionsTypes,
  Player,
} from '@badman/backend-database';
import * as webPush from 'web-push';
import { Notifier } from '../notifier.base';
import { unitOfTime } from 'moment';

interface SyncEncounterMeta {
  encounter: EncounterCompetition;
  url: string;
  urlBadman: string;
}

export class SyncEncounterFailed extends Notifier<
  SyncEncounterMeta,
  {
    email: string;
    slug: string;
  }
> {
  protected linkType = 'encounter';
  protected type: keyof NotificationOptionsTypes = 'synEncounterFailed';

  private readonly options = (event: SyncEncounterMeta) => {
    const notification = {
      notification: {
        title: `Sync encounter mislukt`,
        body: `${event.encounter.home?.name} vs ${event.encounter.away?.name} hebben we niet succesvol kunnen controleren of het ingevuld is`,
      },
    } as webPush.RequestOptions; 

    return notification;
  };

  async notifyPush(player: Player, data: SyncEncounterMeta): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(player, this.options(data));
  }
  async notifyEmail(
    player: Player,
    data: SyncEncounterMeta,
    args?: { email: string },
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    const email = args?.email ?? player.email;
    if (!email) {
      this.logger.debug(`No email found for ${player.fullName}`);
      return;
    }

    if (!data?.encounter) {
      this.logger.debug(`No event found `);
      return;
    }

    if (!player?.slug) {
      this.logger.debug(`No slug found for ${player.fullName}`);
      return;
    }

    await this.mailing.sendSyncEncounterFailedMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data?.encounter,
      data.url,
      data.urlBadman,
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: SyncEncounterMeta,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string },
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
