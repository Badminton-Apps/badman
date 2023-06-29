import { EncounterCompetition, NotificationOptionsTypes, Player } from '@badman/backend-database';
import { Notifier } from '../notifier.base';

export class CompetitionEncounterChangeNewRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
}> {
  protected linkType = 'encounterCompetition';
  protected type: keyof NotificationOptionsTypes ='encounterChangeNewNotification';

  notifyPush(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    return Promise.resolve();
  }
  notifyEmail(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    return Promise.resolve();
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
