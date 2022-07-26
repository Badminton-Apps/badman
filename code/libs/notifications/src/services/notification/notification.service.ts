import { MailingService } from '@badman/mailing';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(private mailing: MailingService) {}

  notify(userId: number, type: string, data: unknown) {
    // check
  }
}
