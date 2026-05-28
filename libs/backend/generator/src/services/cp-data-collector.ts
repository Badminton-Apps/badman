import {
  Club,
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { EnrollmentValidationService } from "@badman/backend-enrollment";
import { I18nTranslations, SubEventTypeEnum, TeamMembershipType } from "@badman/utils";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { format } from "date-fns";
import { I18nService } from "nestjs-i18n";
import {
  CpClub,
  CpEntry,
  CpLocation,
  CpMemo,
  CpPayload,
  CpPlayer,
  CpSubEvent,
  CpTeam,
  CpTeamPlayer,
} from "../interfaces/cp-payload.interface";

interface TeamData {
  dbTeam: Team;
  dbEntry: EventEntry;
  dbSubEvent: SubEventCompetition;
}

@Injectable()
export class CpDataCollector {
  private readonly logger = new Logger(CpDataCollector.name);

  constructor(
    private _validation: EnrollmentValidationService,
    private readonly i18nService: I18nService<I18nTranslations>
  ) {}

  async collect(eventId: string): Promise<CpPayload> {
    this.logger.log(`Collecting CP data for event ${eventId}`);

    const dbEvent = await EventCompetition.findByPk(eventId);
    if (!dbEvent) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const dbSubEvents = await dbEvent.getSubEventCompetitions();

    // Collect clubs, locations, teams, players, entries
    const clubMap = new Map<string, { dbClub: Club }>();
    const teamDataList: TeamData[] = [];

    // Traverse: dbSubEvents → entries → teams → clubs
    for (const dbSubEvent of dbSubEvents) {
      const dbEntries = await dbSubEvent.getEventEntries();
      for (const dbEntry of dbEntries) {
        const [dbTeam] = await Promise.all([
          dbEntry.getTeam({
            include: [{ model: Player, as: "players" }],
          }),
        ]);
        const dbClub = await dbTeam.getClub();

        if (!dbClub) {
          this.logger.warn(`Team ${dbTeam.name} has no club, skipping`);
          continue;
        }

        if (!clubMap.has(dbClub.id)) {
          clubMap.set(dbClub.id, { dbClub });
        }

        teamDataList.push({ dbTeam, dbEntry, dbSubEvent });
      }
    }

    // Build sub-events payload
    const cpSubEvents = this._collectSubEvents(dbSubEvents);

    // Build clubs payload
    const cpClubs = this._collectClubs(clubMap);

    // Build locations payload
    const cpLocations = await this._collectLocations(clubMap);

    // Build teams payload
    const { cpTeams, cpEntries } = await this._collectTeams(teamDataList, clubMap);

    // Build players + teamPlayers payload
    const { cpPlayers, cpTeamPlayers } = await this._collectPlayers(teamDataList, clubMap);

    // Build memos payload
    const cpMemos = await this._collectMemos(dbEvent, clubMap, teamDataList);

    return {
      event: {
        name: dbEvent.name!,
        season: dbEvent.season,
      },
      subEvents: cpSubEvents,
      clubs: cpClubs,
      locations: cpLocations,
      teams: cpTeams,
      players: cpPlayers,
      teamPlayers: cpTeamPlayers,
      entries: cpEntries,
      memos: cpMemos,
      settings: {
        tournamentName: dbEvent.name!,
      },
    };
  }

  private _collectSubEvents(dbSubEvents: SubEventCompetition[]): CpSubEvent[] {
    return dbSubEvents.map((dbSubEvent, i) => ({
      refId: dbSubEvent.id,
      name: dbSubEvent.name!,
      gender: this._getGender(dbSubEvent.eventType),
      sortOrder: i,
    }));
  }

  private _collectClubs(clubMap: Map<string, { dbClub: Club }>): CpClub[] {
    return [...clubMap.values()].map(({ dbClub }) => ({
      refId: dbClub.id,
      name: dbClub.name || "",
      clubId: dbClub.clubId!,
      // 19 = Belgium (Competition Planner country code for Belgian federations)
      country: 19,
      abbreviation: dbClub.abbreviation || "",
    }));
  }

  private async _collectLocations(clubMap: Map<string, { dbClub: Club }>): Promise<CpLocation[]> {
    const cpLocations: CpLocation[] = [];

    for (const [, { dbClub }] of clubMap) {
      const dbLocations = await dbClub.getLocations();
      for (const dbLocation of dbLocations) {
        cpLocations.push({
          refId: dbLocation.id,
          clubRefId: dbClub.id,
          name: dbLocation.name || "",
          address: `${dbLocation.street || ""} ${dbLocation.streetNumber || ""}`.trim(),
          postalcode: dbLocation.postalcode || "",
          city: dbLocation.city || "",
          phone: dbLocation.phone || null,
        });
      }
    }

    return cpLocations;
  }

  private async _collectTeams(
    teamDataList: TeamData[],
    clubMap: Map<string, { dbClub: Club }>
  ): Promise<{ cpTeams: CpTeam[]; cpEntries: CpEntry[] }> {
    const cpTeams: CpTeam[] = [];
    const cpEntries: CpEntry[] = [];

    for (const { dbTeam, dbEntry, dbSubEvent } of teamDataList) {
      const club = clubMap.get(dbTeam.clubId!);
      if (!club) continue;

      const index = dbEntry.meta?.competition?.teamIndex;

      const [dbCaptain, dbPreferredLocation] = await Promise.all([
        dbTeam.getCaptain(),
        dbTeam.getPrefferedLocation(),
      ]);

      cpTeams.push({
        refId: dbTeam.id,
        clubRefId: club.dbClub.id,
        subEventRefId: dbSubEvent.id,
        name: `${dbTeam.name} (${index})`,
        // 19 = Belgium (Competition Planner country code)
        country: 19,
        entryDate: this._formatEntryDate(dbEntry.createdAt ?? new Date()),
        contact: dbCaptain?.fullName || null,
        phone: dbTeam.phone || null,
        email: dbTeam.email || null,
        dayOfWeek: this._getDayOfWeek(dbTeam.preferredDay),
        planTime: dbTeam.preferredTime ? `${dbTeam.preferredTime}` : null,
        preferredLocationRefId: dbPreferredLocation?.id || null,
      });

      cpEntries.push({
        teamRefId: dbTeam.id,
        subEventRefId: dbSubEvent.id,
      });
    }

    return { cpTeams, cpEntries };
  }

  private async _collectPlayers(
    teamDataList: TeamData[],
    clubMap: Map<string, { dbClub: Club }>
  ): Promise<{ cpPlayers: CpPlayer[]; cpTeamPlayers: CpTeamPlayer[] }> {
    // Deduplicate players per club
    const playersPerClub = new Map<
      string,
      { id: string; single?: number; double?: number; mix?: number }[]
    >();

    for (const { dbTeam, dbEntry } of teamDataList) {
      const players = [...(dbEntry?.meta?.competition?.players ?? [])];
      const clubId = dbTeam.clubId!;

      const existing = playersPerClub.get(clubId) ?? [];
      for (const player of players) {
        if (!existing.find((p) => p.id === player.id)) {
          existing.push({
            id: player.id!,
            single: player.single,
            double: player.double,
            mix: player.mix,
          });
        }
      }
      playersPerClub.set(clubId, existing);
    }

    // Fetch full player data and build payload
    const cpPlayers: CpPlayer[] = [];
    const playerRefSet = new Set<string>();

    for (const [clubId, entryPlayers] of playersPerClub) {
      const club = clubMap.get(clubId);
      if (!club) continue;

      const playerIds = entryPlayers.map((p) => p.id).filter(Boolean) as string[];
      const dbPlayers = await Player.findAll({
        where: { id: playerIds },
      });

      for (const dbPlayer of dbPlayers) {
        if (playerRefSet.has(dbPlayer.id)) continue;
        playerRefSet.add(dbPlayer.id);

        const entryPlayer = entryPlayers.find((p) => p.id === dbPlayer.id);

        cpPlayers.push({
          refId: dbPlayer.id,
          clubRefId: clubId,
          lastName: dbPlayer.lastName || "",
          firstName: dbPlayer.firstName || "",
          gender: this._getGender(dbPlayer.gender),
          memberId: dbPlayer.memberId || null,
          levels: {
            single: entryPlayer?.single ?? -1,
            double: entryPlayer?.double ?? -1,
            mix: entryPlayer?.mix ?? -1,
          },
        });
      }
    }

    // Build teamPlayers from entry meta
    const cpTeamPlayers: CpTeamPlayer[] = [];
    for (const { dbTeam, dbEntry } of teamDataList) {
      const players = [...(dbEntry?.meta?.competition?.players ?? [])];
      for (const player of players) {
        if (player.id) {
          cpTeamPlayers.push({
            teamRefId: dbTeam.id,
            playerRefId: player.id,
            status: 1,
          });
        }
      }
    }

    return { cpPlayers, cpTeamPlayers };
  }

  private async _collectMemos(
    dbEvent: EventCompetition,
    clubMap: Map<string, { dbClub: Club }>,
    teamDataList: TeamData[]
  ): Promise<CpMemo[]> {
    const cpMemos: CpMemo[] = [];

    for (const [, { dbClub }] of clubMap) {
      const teamsOfClub = teamDataList.filter((t) => t.dbTeam.clubId === dbClub.id);

      const validation = await this._validation.fetchAndValidate(
        {
          clubId: dbClub.id,
          teams: teamsOfClub.map((t) => ({
            id: t.dbTeam.id,
            name: t.dbTeam.name,
            type: t.dbTeam.type,
            link: t.dbTeam.link,
            teamNumber: t.dbTeam.teamNumber,
            basePlayers: [...(t.dbEntry?.meta?.competition?.players ?? [])],
            players: (t.dbTeam.players ?? [])
              .filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.REGULAR)
              .map((p) => p.id),
            backupPlayers: (t.dbTeam.players ?? [])
              .filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.BACKUP)
              .map((p) => p.id),
            subEventId: t.dbEntry?.subEventId,
          })),
          season: dbEvent.season,
        },
        EnrollmentValidationService.defaultValidators()
      );

      const dbComments = await dbClub.getComments({
        where: {
          linkType: "competition",
          linkId: dbEvent.id,
        },
      });

      for (const team of validation.teams ?? []) {
        if (!team) continue;

        const teamData = teamDataList.find((t) => t.dbTeam.id === team.id);
        if (!teamData) {
          this.logger.warn(
            `Team ${team.id} not in team list for club ${dbClub.name}(${dbClub.id})`
          );
          continue;
        }

        const errors = (
          team.errors?.map((e) => {
            if (!e.message) return "";
            const message: string = this.i18nService.translate(e.message, {
              args: e.params as never,
              lang: "nl_BE",
            });
            return message.replace(/<[^>]*>?/gm, "");
          }) ?? []
        ).filter(Boolean);

        const commentTexts = dbComments?.map((c) => `${c.message}`) ?? [];

        // Build memo text
        let memo = "";

        if (errors.length > 0) {
          memo += `--==[Fouten]==--\n`;
          memo += errors.join("\n");
          memo += "\n\n";
        }

        if (commentTexts.length > 0) {
          memo += `--==[Club comments]==--\n`;
          memo += commentTexts.join("\n");
          memo += "\n\n";
        }

        if (memo.length > 0) {
          cpMemos.push({
            teamRefId: teamData.dbTeam.id,
            memo,
          });
        }
      }
    }

    return cpMemos;
  }

  /**
   * Format a date for Access date literals: MM/DD/YYYY HH:mm:ss
   */
  private _formatEntryDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "MM/dd/yyyy HH:mm:ss");
  }

  /**
   * Map day name to Competition Planner day number (1=monday through 7=sunday).
   * The input values come from the Team model's preferredDay ENUM.
   */
  private _getDayOfWeek(day?: string): number | null {
    if (!day) return null;

    const dayMap: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    };

    return dayMap[day] ?? null;
  }

  private _getGender(gender?: string): number | null {
    if (!gender) return null;

    switch (gender) {
      case "M":
      case SubEventTypeEnum.M:
        return 1;
      case "F":
      case "V":
      case SubEventTypeEnum.F:
        return 2;
      case "MX":
      case SubEventTypeEnum.MX:
        return 3;
      default:
        return null;
    }
  }
}
