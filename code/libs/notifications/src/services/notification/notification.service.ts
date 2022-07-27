import { EncounterChange } from '@badman/api/database';
import { MailingService } from '@badman/mailing';
import { Injectable } from '@nestjs/common';
import { EncounterNotifications } from '../../types';

@Injectable()
export class NotificationService {
  constructor(private mailing: MailingService) {}

  notify(type: EncounterNotifications, data: unknown) {
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
