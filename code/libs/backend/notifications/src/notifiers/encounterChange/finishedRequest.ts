import { EncounterCompetition, Player } from '@badman/backend-database';
import { Notifier } from '../notifier.base';

export class CompetitionEncounterChangeFinishRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
}> {
  protected linkType = 'encounterCompetition';
  protected type = 'encounterChangeFinishedNotification';

  notifyPush(
    player: Player,
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    return null;
  }
  notifyEmail(
    player: Player,
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    return null;
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
