import { Injectable, Logger } from "@nestjs/common";
import { MailingService } from "@badman/backend-mailing";
import { EncounterCompetition } from "@badman/backend-database";

export interface NotificationRecipient {
  fullName: string;
  email: string;
  slug: string;
}

@Injectable()
export class EnterScoresNotificationService {
  private readonly logger = new Logger(EnterScoresNotificationService.name);

  constructor(private readonly mailingService: MailingService) {}

  async sendSuccessNotification(
    encounter: EncounterCompetition,
    recipient: NotificationRecipient,
    toernooiUrl?: string
  ): Promise<void> {
    try {
      await this.mailingService.sendEnterScoresSuccessMail(
        encounter.id,
        recipient,
        encounter.visualCode,
        toernooiUrl
      );
      this.logger.log(`Success email sent for encounter ${encounter.visualCode || encounter.id}`);
    } catch (emailError) {
      this.logger.error("Failed to send success email:", emailError?.message || emailError);
      throw emailError;
    }
  }

  async sendFailureNotification(
    encounterId: string,
    error: string,
    recipient: NotificationRecipient,
    encounterVisualCode?: string,
    toernooiUrl?: string
  ): Promise<void> {
    try {
      await this.mailingService.sendEnterScoresFailedMail(
        encounterId,
        error,
        recipient,
        encounterVisualCode,
        toernooiUrl
      );
      this.logger.log(`Failure email sent for encounter ${encounterVisualCode || encounterId}`);
    } catch (emailError) {
      this.logger.error("Failed to send failure email:", emailError?.message || emailError);
      throw emailError;
    }
  }

  createDevRecipient(devEmailDestination: string): NotificationRecipient {
    return {
      fullName: "Dev team",
      email: devEmailDestination,
      slug: "dev",
    };
  }

  shouldSendNotification(devEmailDestination?: string): boolean {
    return !!devEmailDestination;
  }

  logNotificationSkipped(reason: string, encounterInfo: string): void {
    this.logger.log(
      `Skipping ${reason} notification - no dev email destination configured for encounter ${encounterInfo}`
    );
  }
}
