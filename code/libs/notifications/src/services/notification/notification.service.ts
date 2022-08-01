import { EncounterChange } from '@badman/api/database';
import { MailingService } from '@badman/mailing';
import { Injectable, Logger } from '@nestjs/common';
import { EncounterNotifications } from '../../types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(private mailing: MailingService) {}

  notify(type: EncounterNotifications, data: unknown) {
    this.logger.debug(`Notifying ${EncounterNotifications[type]}`, { data });

    if (type === EncounterNotifications.requested) {
      const { changeRequest, homeTeamRequests } = data as {
        changeRequest: EncounterChange;
        homeTeamRequests: boolean;
      };

      this.mailing.sendRequestMail(changeRequest, homeTeamRequests);
    } else if (type === EncounterNotifications.accepted) {
      const { changeRequest } = data as {
        changeRequest: EncounterChange;
      };

      this.mailing.sendRequestFinishedMail(changeRequest);
    }
  }
}
