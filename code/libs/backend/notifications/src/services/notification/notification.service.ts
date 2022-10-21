import { EncounterCompetition, Player } from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { Injectable, Logger } from '@nestjs/common';
import {
  CompetitionEncounterChangeConformationRequestNotifier,
  CompetitionEncounterChangeNewRequestNotifier,
  CompetitionEncounterNotAcceptedNotifier,
  CompetitionEncounterNotEnteredNotifier,
} from '../../notifiers';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private mailing: MailingService) {}

  async notifyEncounterChange(
    encounter: EncounterCompetition,
    homeTeamRequests: boolean
  ) {
    const homeTeam = await encounter.getHome({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });
    const awayTeam = await encounter.getAway({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });

    const newReqTeam = homeTeamRequests ? homeTeam : awayTeam;
    const confReqTeam = homeTeamRequests ? awayTeam : homeTeam;

    const notifierNew = new CompetitionEncounterChangeNewRequestNotifier(
      this.mailing
    );
    const notifierConform =
      new CompetitionEncounterChangeConformationRequestNotifier(this.mailing);

    notifierNew.notify(
      newReqTeam.captain,
      encounter.id,
      { encounter },
      { email: newReqTeam.email }
    );

    notifierConform.notify(
      confReqTeam.captain,
      encounter.id,
      { encounter },
      { email: confReqTeam.email }
    );
  }

  async notifyEncounterChangeFinished(encounter: EncounterCompetition) {
    const notifierFinished = new CompetitionEncounterChangeNewRequestNotifier(
      this.mailing
    );
    const homeTeam = await encounter.getHome({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });
    const awayTeam = await encounter.getAway({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });

    notifierFinished.notify(
      homeTeam.captain,
      encounter.id,
      { encounter },
      { email: homeTeam.email }
    );

    notifierFinished.notify(
      awayTeam.captain,
      encounter.id,
      { encounter },
      { email: awayTeam.email }
    );
  }

  async notifyEncounterNotEntered(encounter: EncounterCompetition) {
    const notifierNotEntered = new CompetitionEncounterNotEnteredNotifier(
      this.mailing
    );

    const homeTeam = await encounter.getHome({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });

    // Property was loaded when sending notification
    const eventId =
      encounter.drawCompetition.subEventCompetition.eventCompetition.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

    notifierNotEntered.notify(
      homeTeam.captain,
      encounter.id,
      { encounter },
      { email: homeTeam.email, url }
    );
  }

  async notifyEncounterNotAccepted(encounter: EncounterCompetition) {
    const notifierNotAccepted = new CompetitionEncounterNotAcceptedNotifier(
      this.mailing
    );
    const homeTeam = await encounter.getHome({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });

    // Property was loaded when sending notification
    const eventId =
      encounter.drawCompetition.subEventCompetition.eventCompetition.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

    notifierNotAccepted.notify(
      homeTeam.captain,
      encounter.id,
      { encounter },
      { email: homeTeam.email, url }
    );
  }
}
