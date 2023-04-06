import {
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Player,
} from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { Injectable, Logger } from '@nestjs/common';
import {
  CompetitionEncounterChangeConformationRequestNotifier,
  CompetitionEncounterChangeNewRequestNotifier,
  CompetitionEncounterNotAcceptedNotifier,
  CompetitionEncounterNotEnteredNotifier,
  EventSyncedSuccessNotifier,
  EventSyncedFailedNotifier,
} from '../../notifiers';
import { PushService } from '../push';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private mailing: MailingService,
    private push: PushService,
    private configService: ConfigService
  ) {}

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
      this.mailing,
      this.push
    );
    const notifierConform =
      new CompetitionEncounterChangeConformationRequestNotifier(
        this.mailing,
        this.push
      );

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
      this.mailing,
      this.push
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
      this.mailing,
      this.push
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
      this.mailing,
      this.push
    );
    const awayTeam = await encounter.getAway({
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
      awayTeam.captain,
      encounter.id,
      { encounter },
      { email: awayTeam.email, url }
    );
  }

  async notifySyncFinished(
    userId: string,
    {
      event,
      success,
    }: { event?: EventCompetition | EventTournament; success: boolean }
  ) {
    const notifierSyncFinished = success
      ? new EventSyncedSuccessNotifier(this.mailing, this.push)
      : new EventSyncedFailedNotifier(this.mailing, this.push);

    const user = await Player.findByPk(userId);
    const url = `${this.configService.get('CLIENT_URL')}/events/${event?.id}`;

    notifierSyncFinished.notify(
      user,
      event.id,
      { event, success },
      { email: user.email, url }
    );
  }
}
