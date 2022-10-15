import { EncounterCompetition, Player } from '@badman/backend/database';
import { Notifier } from '../notifier.base';

export class CompetitionEncounterChangeConformationRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
}> {
  protected linkType = 'encounterCompetition';
  protected type = 'encounterChangeConformationNotification';
  
  notifyPush(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    return null;
  }
  notifyEmail(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    return null;
  }
  notifySms(
    player: Player,
    data: { encounter: EncounterCompetition },
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return null;
  }
}
