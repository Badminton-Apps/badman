import {
  EncounterValidationError,
  EncounterValidationService,
} from "@badman/backend-change-encounter";
import {
  Availability,
  Club,
  EncounterCompetition,
  EventCompetition,
  EventEntry,
  EventTournament,
  FrontendContextType,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { MailingService } from "@badman/backend-mailing";
import { ConfigType, I18nTranslations, sortTeams } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import {
  CompetitionEncounterChangeConfirmationRequestNotifier,
  CompetitionEncounterChangeFinishRequestNotifier,
  CompetitionEncounterChangeNewRequestNotifier,
  CompetitionEncounterHasCommentNotifier,
  CompetitionEncounterNotAcceptedNotifier,
  CompetitionEncounterNotEnteredNotifier,
  EventSyncedFailedNotifier,
  EventSyncedSuccessNotifier,
  SyncEncounterFailed,
} from "../../notifiers";
import { ClubEnrollmentNotifier } from "../../notifiers/clubenrollment";
import { PushService } from "../push";

@Injectable()
export class NotificationService {
  private readonly _logger = new Logger(NotificationService.name);

  constructor(
    private mailing: MailingService,
    private push: PushService,
    private configService: ConfigService<ConfigType>,
    private changeEncounterValidation: EncounterValidationService,
    private readonly i18nService: I18nService<I18nTranslations>
  ) {}

  async notifyEncounterChange(
    encounter: EncounterCompetition,
    homeTeamRequests: boolean,
    frontendContext?: FrontendContextType,
    eventId?: string
  ) {
    this._logger.log(
      `[notifyEncounterChange] Starting notification for encounter ${encounter.id}, homeTeamRequests: ${homeTeamRequests}`
    );

    const homeTeam = await Team.findByPk(encounter.homeTeamId, {
      include: [
        {
          association: "captain",
        },
      ],
    });
    const awayTeam = await Team.findByPk(encounter.awayTeamId, {
      include: [
        {
          association: "captain",
        },
      ],
    });

    if (!homeTeam || !awayTeam) {
      this._logger.error(
        `[notifyEncounterChange] Teams not found - homeTeamId: ${encounter.homeTeamId}, awayTeamId: ${encounter.awayTeamId}`
      );
      return;
    }

    // just make sure the teams are loaded
    encounter.home = homeTeam;
    encounter.away = awayTeam;

    const season = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.season;

    const newReqTeam = homeTeamRequests ? homeTeam : awayTeam;
    const confReqTeam = homeTeamRequests ? awayTeam : homeTeam;

    this._logger.log(
      `[notifyEncounterChange] Teams loaded - newReqTeam: ${newReqTeam.name} (${newReqTeam.email}), confReqTeam: ${confReqTeam.name} (${confReqTeam.email})`
    );

    // Generate URLs based on who made the request vs who needs to confirm
    const newReqUrl = await this._getEncounterChangeUrl(
      encounter,
      frontendContext,
      season,
      newReqTeam,
      eventId
    );
    const confReqUrl = await this._getEncounterChangeUrl(
      encounter,
      frontendContext,
      season,
      confReqTeam,
      eventId
    );

    const notifierNew = new CompetitionEncounterChangeNewRequestNotifier(this.mailing, this.push);
    const notifierConform = new CompetitionEncounterChangeConfirmationRequestNotifier(
      this.mailing,
      this.push
    );

    // Check for potential duplicate email scenario
    if (
      newReqTeam.email &&
      confReqTeam.email &&
      newReqTeam.email.toLowerCase() === confReqTeam.email.toLowerCase()
    ) {
      this._logger.warn(
        `[notifyEncounterChange] Potential duplicate email detected: ${newReqTeam.email} for both teams`
      );
    }

    if (newReqTeam.captain && newReqTeam.email) {
      this._logger.log(
        `[notifyEncounterChange] Sending new request notification to ${newReqTeam.captain.email} (team email: ${newReqTeam.email})`
      );
      notifierNew.notify(
        newReqTeam.captain,
        encounter.id,
        { encounter, isHome: homeTeamRequests, url: newReqUrl },
        { email: newReqTeam.email }
      );
    } else {
      this._logger.warn(
        `[notifyEncounterChange] Skipping new request notification - captain: ${!!newReqTeam.captain}, email: ${!!newReqTeam.email}`
      );
    }

    if (confReqTeam.captain && confReqTeam.email && confReqTeam.email !== newReqTeam.email) {
      this._logger.log(
        `[notifyEncounterChange] Sending confirmation request notification to ${confReqTeam.captain.email} (team email: ${confReqTeam.email})`
      );
      notifierConform.notify(
        confReqTeam.captain,
        encounter.id,
        { encounter, isHome: !homeTeamRequests, url: confReqUrl },
        { email: confReqTeam.email }
      );
    } else {
      const skipReason = !confReqTeam.captain
        ? "no captain"
        : !confReqTeam.email
          ? "no email"
          : confReqTeam.email === newReqTeam.email
            ? "duplicate email"
            : "unknown";
      this._logger.warn(
        `[notifyEncounterChange] Skipping confirmation notification - reason: ${skipReason}`
      );
    }

    this._logger.log(
      `[notifyEncounterChange] Completed notification for encounter ${encounter.id}`
    );
  }

  async notifyEncounterChangeFinished(
    encounter: EncounterCompetition,
    locationHasChanged: boolean,
    frontendContext?: FrontendContextType,
    eventId?: string
  ) {
    this._logger.log(
      `[notifyEncounterChangeFinished] Starting finished notification for encounter ${encounter.id}, locationHasChanged: ${locationHasChanged}`
    );

    const notifierFinished = new CompetitionEncounterChangeFinishRequestNotifier(
      this.mailing,
      this.push
    );
    const homeTeam = await Team.findByPk(encounter.homeTeamId, {
      include: [
        {
          association: "captain",
        },
      ],
    });
    const awayTeam = await Team.findByPk(encounter.awayTeamId, {
      include: [
        {
          association: "captain",
        },
      ],
    });

    if (!homeTeam || !awayTeam) {
      this._logger.error(
        `[notifyEncounterChangeFinished] Teams not found - homeTeamId: ${encounter.homeTeamId}, awayTeamId: ${encounter.awayTeamId}`
      );
      return;
    }

    // just make sure the teams are loaded
    encounter.home = homeTeam;
    encounter.away = awayTeam;

    this._logger.log(
      `[notifyEncounterChangeFinished] Teams loaded - homeTeam: ${homeTeam.name} (${homeTeam.email}), awayTeam: ${awayTeam.name} (${awayTeam.email})`
    );

    const season = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.season;

    // For finished notifications, both teams get the same URL since the change is complete
    const homeTeamUrl = await this._getEncounterChangeUrl(
      encounter,
      frontendContext,
      season,
      homeTeam,
      eventId
    );
    const awayTeamUrl = await this._getEncounterChangeUrl(
      encounter,
      frontendContext,
      season,
      awayTeam,
      eventId
    );

    if (homeTeam.captain && homeTeam.email) {
      this._logger.log(
        `[notifyEncounterChangeFinished] Sending finished notification to home team captain ${homeTeam.captain.email} (team email: ${homeTeam.email})`
      );
      const validation = await this._getValidationMessage(homeTeam);
      notifierFinished.notify(
        homeTeam.captain,
        encounter.id,
        { encounter, locationHasChanged, isHome: true, validation, url: homeTeamUrl },
        { email: homeTeam.email }
      );
    } else {
      this._logger.warn(
        `[notifyEncounterChangeFinished] Skipping home team notification - captain: ${!!homeTeam.captain}, email: ${!!homeTeam.email}`
      );
    }

    if (awayTeam.captain && awayTeam.email && awayTeam.email !== homeTeam.email) {
      this._logger.log(
        `[notifyEncounterChangeFinished] Sending finished notification to away team captain ${awayTeam.captain.email} (team email: ${awayTeam.email})`
      );
      const validation = await this._getValidationMessage(awayTeam);

      notifierFinished.notify(
        awayTeam.captain,
        encounter.id,
        { encounter, locationHasChanged, isHome: false, validation, url: awayTeamUrl },
        { email: awayTeam.email }
      );
    } else {
      const skipReason = !awayTeam.captain
        ? "no captain"
        : !awayTeam.email
          ? "no email"
          : awayTeam.email === homeTeam.email
            ? "duplicate email"
            : "unknown";
      this._logger.warn(
        `[notifyEncounterChangeFinished] Skipping away team notification - reason: ${skipReason}`
      );
    }

    if (locationHasChanged) {
      this._logger.log(
        `[notifyEncounterChangeFinished] Sending location changed mail for encounter ${encounter.id}`
      );
      await this.mailing.sendLocationChangedMail(encounter);
    }

    this._logger.log(
      `[notifyEncounterChangeFinished] Completed finished notification for encounter ${encounter.id}`
    );
  }

  async notifyEncounterNotEntered(encounter: EncounterCompetition) {
    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    if (!devEmailDestination) {
      this._logger.error(
        "DEV_EMAIL_DESTINATION not configured - skipping notifyEncounterNotEntered"
      );
      return;
    }

    const notifierNotEntered = new CompetitionEncounterNotEnteredNotifier(this.mailing, this.push);

    // Property was loaded when sending notification
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;

    // Create dev team user object for notification
    const devUser = {
      fullName: "Dev Team",
      email: devEmailDestination,
      slug: "dev",
    };

    notifierNotEntered.notify(
      devUser as Player,
      encounter.id,
      { encounter },
      { email: devEmailDestination, url }
    );
  }

  async notifyEncounterHasComment(encounter: EncounterCompetition) {
    const notifierNotEntered = new CompetitionEncounterHasCommentNotifier(this.mailing, this.push);

    const event = encounter.drawCompetition?.subEventCompetition?.eventCompetition;
    if (!event) {
      throw new Error("Event not found");
    }

    // Property was loaded when sending notification
    const eventId = event?.visualCode;
    const matchId = encounter.visualCode;
    const url = `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;
    const email = event.contactEmail ?? event.contact?.email;

    if (!email) {
      this._logger.error("Email not found");
      return;
    }

    let contact = event.contact;

    if (!contact?.email || !contact?.fullName || !contact?.slug) {
      contact = (await Player.findByPk(event.contactId ?? event.contact?.id)) as Player;
    }

    notifierNotEntered.notify(contact, encounter.id, { encounter }, { email, url });
  }

  async notifyEncounterNotAccepted(encounter: EncounterCompetition) {
    const notifierNotAccepted = new CompetitionEncounterNotAcceptedNotifier(
      this.mailing,
      this.push
    );
    const awayTeam = await encounter.getAway({
      include: [
        {
          association: "captain",
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
        { email: awayTeam.email ?? awayTeam.captain?.email, url }
      );
    }
  }

  async notifySyncFinished(
    userId: string,
    { event, success }: { event?: EventCompetition | EventTournament; success: boolean }
  ) {
    const notifierSyncFinished = success
      ? new EventSyncedSuccessNotifier(this.mailing, this.push)
      : new EventSyncedFailedNotifier(this.mailing, this.push);

    const user = await Player.findByPk(userId);
    const url = `${this.configService.get("CLIENT_URL")}/competition/${event?.id}`;

    if (user?.email && event?.id && url && user?.slug) {
      notifierSyncFinished.notify(
        user,
        event?.id,
        { event, success },
        { email: user?.email, url, slug: user?.slug }
      );
    }
  }

  async notifyEnrollment(userId: string, clubId: string, season: number, email: string) {
    const notifierEnrollment = new ClubEnrollmentNotifier(this.mailing, this.push);

    const user = await Player.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
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
              as: "captain",
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
      throw new Error("Club not found");
    }

    const locations = await club.getLocations({
      include: [{ model: Availability, where: { season } }],
    });

    // eventEntries->subEventIds
    const eventEntries = new Set(
      club.teams
        ?.map((team) => team?.entry)
        ?.map((eventEntry) => eventEntry?.subEventCompetition)
        ?.map((subEvent) => subEvent?.eventId)
    );

    const comments = await club.getComments({
      where: {
        linkId: [...eventEntries],
        linkType: "competition",
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
      .flat() as string[];

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
    const url = `${this.configService.get("CLIENT_URL")}/club/${club.id}`;

    notifierEnrollment.notify(
      user,
      clubId,
      { club, locations, comments },
      { email: email || user.email || "", url },
      {
        email: true,
      }
    );
  }

  async notifySyncEncounterFailed({
    encounter,
    url,
  }: {
    encounter?: EncounterCompetition;
    url: string;
  }) {
    const notifier = new SyncEncounterFailed(this.mailing, this.push);

    if (!encounter) {
      throw new Error("Encounter not found");
    }

    const devEmailDestination = this.configService.get<string>("DEV_EMAIL_DESTINATION");

    if (!devEmailDestination) {
      this._logger.error("DEV_EMAIL_DESTINATION not configured");
      return;
    }

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
      const homeTeam = await Team.findByPk(encounter.homeTeamId);
      encounter.home = homeTeam as Team | undefined;
    }

    if (!encounter?.away) {
      const awayTeam = await Team.findByPk(encounter.awayTeamId);
      encounter.away = awayTeam as Team | undefined;
    }

    const urlBadman = `${this.configService.get("CLIENT_URL")}/competition/${
      encounter?.drawCompetition?.subEventCompetition?.eventCompetition?.id
    }/draw/${encounter?.drawCompetition?.id}`;

    // Create a dev team user object for notification
    const devUser = {
      fullName: "Dev Team",
      email: devEmailDestination,
      slug: "dev",
    };

    if (encounter?.id && url) {
      notifier.notify(
        devUser as Player,
        encounter.id,
        { encounter, url, urlBadman },
        { email: devEmailDestination, slug: "dev" }
      );
    }
  }

  private async _getValidationMessage(team: Team, captainId?: string) {
    const encountersH = await team.getHomeEncounters({
      attributes: ["id", "date"],

      include: [
        {
          association: "home",
          attributes: ["id", "name"],
        },
        {
          association: "away",
          attributes: ["id", "name"],
        },
      ],
    });
    const encountersA = await team.getHomeEncounters({
      attributes: ["id", "date"],

      include: [
        {
          association: "home",
          attributes: ["id", "name"],
        },
        {
          association: "away",
          attributes: ["id", "name"],
        },
      ],
    });

    const validationErrors = [] as {
      encounter: EncounterCompetition;
      errors: EncounterValidationError<unknown>[];
    }[];

    for (const encounter of [...encountersH, ...encountersA]) {
      const validation = await this.changeEncounterValidation.validate({
        encounterId: encounter.id,
      });

      if (!validation.valid && validation.errors) {
        validationErrors.push({
          encounter: encounter,
          errors: validation.errors,
        });
      }
    }

    const errors = [] as {
      encounter: EncounterCompetition;
      errors: string[];
    }[];

    // map all errors to the encounter
    for (const error of validationErrors ?? []) {
      errors.push({
        encounter: error.encounter,
        errors: error.errors.map((err) =>
          this.i18nService.translate(err.message, {
            args: err.params as never,
            lang: "nl_BE",
          })
        ),
      });
    }

    return errors;
  }

  private async _getEncounterChangeUrl(
    encounter: EncounterCompetition,
    frontendContext?: FrontendContextType,
    season?: number,
    team?: Team,
    eventId?: string
  ): Promise<string> {
    const baseClientUrl = this.configService.get("CLIENT_URL");
    const baseLegacyClientUrl = this.configService.get("LEGACY_CLIENT_URL");

    switch (frontendContext) {
      case "my-club":
        return `${baseClientUrl}/my-club/${team?.clubId}/change-encounter/${encounter.id}`;
      case "club":
        return `${baseClientUrl}/club/${team?.clubId}/change-encounter/${encounter.id}`;
      case "competition":
        // Use the provided eventId if available, otherwise fetch it
        let competitionEventId = eventId;
        if (!competitionEventId) {
          const draw = await encounter.getDrawCompetition({
            include: [
              {
                model: SubEventCompetition,
                attributes: ["id", "eventId"],
              },
            ],
          });
          competitionEventId = draw?.subEventCompetition?.eventId;
        }
        return `${baseClientUrl}/competition/${competitionEventId}/change-encounter/${encounter.id}`;
      default:
        // This handles the legacy app, which does not have the context value, and has different routing
        return `${baseLegacyClientUrl}/competition/change-encounter?club=${team?.clubId}&team=${team?.id}&encounter=${encounter.id}&season=${season}`;
    }
  }
}
