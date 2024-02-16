import {
  Availability,
  Club,
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  EventTournament,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { MailingService } from '@badman/backend-mailing';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@badman/utils';
import {
  CompetitionEncounterChangeConfirmationRequestNotifier,
  CompetitionEncounterChangeNewRequestNotifier,
  CompetitionEncounterNotAcceptedNotifier,
  CompetitionEncounterNotEnteredNotifier,
  EventSyncedSuccessNotifier,
  EventSyncedFailedNotifier,
  CompetitionEncounterChangeFinishRequestNotifier,
  SyncEncounterFailed,
} from '../../notifiers';
import { PushService } from '../push';
import { ConfigService } from '@nestjs/config';
import { ClubEnrollmentNotifier } from '../../notifiers/clubenrollment';
import { sortTeams } from '@badman/utils';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private mailing: MailingService,
    private push: PushService,
    private configService: ConfigService<ConfigType>,
  ) {}

  async notifyEncounterChange(encounter: EncounterCompetition, homeTeamRequests: boolean) {
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

    // just make sure the teams are loaded
    encounter.home = homeTeam;
    encounter.away = awayTeam;

    const newReqTeam = homeTeamRequests ? homeTeam : awayTeam;
    const confReqTeam = homeTeamRequests ? awayTeam : homeTeam;

    const notifierNew = new CompetitionEncounterChangeNewRequestNotifier(this.mailing, this.push);
    const notifierConform = new CompetitionEncounterChangeConfirmationRequestNotifier(
      this.mailing,
      this.push,
    );

    if (newReqTeam.captain && newReqTeam.email) {
      notifierNew.notify(
        newReqTeam.captain,
        encounter.id,
        { encounter, isHome: homeTeamRequests },
        { email: newReqTeam.email },
      );
    }

    if (confReqTeam.captain && confReqTeam.email) {
      notifierConform.notify(
        confReqTeam.captain,
        encounter.id,
        { encounter, isHome: !homeTeamRequests },
        { email: confReqTeam.email },
      );
    }
  }

  async notifyEncounterChangeFinished(
    encounter: EncounterCompetition,
    locationHasChanged: boolean,
  ) {
    const notifierFinished = new CompetitionEncounterChangeFinishRequestNotifier(
      this.mailing,
      this.push,
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

    // just make sure the teams are loaded
    encounter.home = homeTeam;
    encounter.away = awayTeam;

    if (homeTeam.captain && homeTeam.email) {
      notifierFinished.notify(
        homeTeam.captain,
        encounter.id,
        { encounter, locationHasChanged, isHome: true },
        { email: homeTeam.email },
      );
    }

    if (awayTeam.captain && awayTeam.email) {
      notifierFinished.notify(
        awayTeam.captain,
        encounter.id,
        { encounter, locationHasChanged, isHome: false },
        { email: awayTeam.email },
      );
    }

    if (locationHasChanged) {
      await this.mailing.sendLocationChangedMail(encounter);
    }
  }

  async notifyEncounterNotEntered(encounter: EncounterCompetition) {
    const notifierNotEntered = new CompetitionEncounterNotEnteredNotifier(this.mailing, this.push);

    const homeTeam = await encounter.getHome({
      include: [
        {
          model: Player,
          as: 'captain',
        },
      ],
    });

    // Property was loaded when sending notification
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

    if (homeTeam.captain && homeTeam.email) {
      notifierNotEntered.notify(
        homeTeam.captain,
        encounter.id,
        { encounter },
        { email: homeTeam.email ?? homeTeam.captain?.email, url },
      );
    }
  }

  async notifyEncounterNotAccepted(encounter: EncounterCompetition) {
    const notifierNotAccepted = new CompetitionEncounterNotAcceptedNotifier(
      this.mailing,
      this.push,
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
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

    if (awayTeam.captain && awayTeam.email) {
      notifierNotAccepted.notify(
        awayTeam.captain,
        encounter.id,
        { encounter },
        { email: awayTeam.email ?? awayTeam.captain?.email, url },
      );
    }
  }

  async notifySyncFinished(
    userId: string,
    { event, success }: { event?: EventCompetition | EventTournament; success: boolean },
  ) {
    const notifierSyncFinished = success
      ? new EventSyncedSuccessNotifier(this.mailing, this.push)
      : new EventSyncedFailedNotifier(this.mailing, this.push);

    const user = await Player.findByPk(userId);
    const url = `${this.configService.get('CLIENT_URL')}/events/${event?.id}`;

    if (user?.email && event?.id && url && user?.slug) {
      notifierSyncFinished.notify(
        user,
        event?.id,
        { event, success },
        { email: user?.email, url, slug: user?.slug },
      );
    }
  }

  async notifyEnrollment(userId: string, clubId: string, season: number, email: string) {
    const notifierEnrollment = new ClubEnrollmentNotifier(this.mailing, this.push);

    const user = await Player.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const club = await Club.findByPk(clubId, {
      include: [
        {
          model: Team,
          where: {
            season,
          },
          include: [
            {
              model: Player,
              as: 'captain',
            },
            {
              model: EventEntry,
              include: [
                {
                  model: SubEventCompetition,
                  include: [
                    {
                      model: EventCompetition,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!club) {
      throw new Error('Club not found');
    }

    const locations = await club.getLocations({
      include: [{ model: Availability, where: { year: season } }],
    });

    // eventEntries->subEventIds
    const eventEntries = new Set(
      club.teams
        ?.map((team) => team?.entry)
        ?.map((eventEntry) => eventEntry?.subEventCompetition)
        ?.map((subEvent) => subEvent?.eventId),
    );

    const comments = await club.getComments({
      where: {
        linkId: [...eventEntries],
        linkType: 'competition',
      },
      include: [
        {
          model: EventCompetition,
        },
        {
          model: Player,
        },
      ],
    });

    const ids = club?.teams
      ?.map((team) => team?.entry?.meta?.competition?.players.map((player) => player.id))
      .flat();

    // fetch all baseaplayers
    const players = await Player.findAll({
      where: {
        id: ids,
      },
    });

    club.teams?.map((team) => {
      const basePlayers = {
        ...team?.entry?.meta?.competition?.players.map((player) => {
          const basePlayer = players.find((p) => p.id === player.id);
          return {
            ...basePlayer?.toJSON(),
            ...player,
          };
        }),
      };

      Object.assign(team?.entry?.meta?.competition ?? {}, {
        players: basePlayers,
      });
    });

    club.teams = club?.teams?.sort(sortTeams);
    const url = `${this.configService.get('CLIENT_URL')}/club/${club.id}`;

    notifierEnrollment.notify(
      user,
      clubId,
      { club, locations, comments },
      { email: email || user.email || '', url },
      {
        email: true,
      },
    );
  }

  async notifySyncEncounterFailed(
    userId: string,
    { encounter, url }: { encounter?: EncounterCompetition; url: string },
  ) {
    const notifier = new SyncEncounterFailed(this.mailing, this.push);

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    const user = await Player.findByPk(userId);

    if (!encounter?.drawCompetition) {
      encounter.drawCompetition = await encounter?.getDrawCompetition();
    }

    if (!encounter?.drawCompetition?.subEventCompetition) {
      encounter.drawCompetition.subEventCompetition =
        await encounter?.drawCompetition?.getSubEventCompetition();
    }

    if (!encounter?.drawCompetition?.subEventCompetition?.eventCompetition) {
      encounter.drawCompetition.subEventCompetition.eventCompetition =
        await encounter?.drawCompetition?.subEventCompetition?.getEventCompetition();
    }

    if (!encounter?.home) {
      encounter.home = await encounter?.getHome();
    }

    if (!encounter?.away) {
      encounter.away = await encounter?.getAway();
    }

    const urlBadman = `${this.configService.get('CLIENT_URL')}/competition/${
      encounter?.drawCompetition?.subEventCompetition?.eventCompetition?.id
    }/draw/${encounter?.drawCompetition?.id}/encounter/${encounter?.id}`;

    if (user?.email && encounter?.id && url && user?.slug) {
      notifier.notify(
        user,
        encounter.id,
        { encounter, url, urlBadman },
        { email: user?.email, slug: user?.slug },
      );
    }
  }
}
