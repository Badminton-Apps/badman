import { Club, EventEntry, Team, Player } from "@badman/backend-database";
import { VisualService, XmlClub, XmlItem, XmlTournament } from "@badman/backend-visual";
import { LevelType, runParallel, SubEventTypeEnum, teamValues } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { isArray } from "class-validator";
import { Op, WhereOptions } from "sequelize";
import { StepOptions, StepProcessor } from "../../../../processing";
import { correctWrongTeams } from "../../../../utils";
import { DrawStepData } from "./draw";
import moment from "moment";

export interface EntryStepData {
  entry: EventEntry;
  xmlTeamName: string;
}

export class CompetitionSyncEntryProcessor extends StepProcessor {
  public draws?: DrawStepData[];
  private _entries: EntryStepData[] = [];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    if (!options) {
      options = {};
    }
    options.logger = options.logger || new Logger(CompetitionSyncEntryProcessor.name);
    super(options);
  }

  public async process(): Promise<EntryStepData[]> {
    await runParallel(this.draws?.map((e) => this._processEntries(e)) ?? [], 1);

    return this._entries;
  }

  private async _processEntries({ draw, internalId }: DrawStepData) {
    const subEvent = await draw.getSubEventCompetition({
      transaction: this.transaction,
    });
    this.logger.debug(
      `Processing entries for draw ${draw.name} - ${subEvent.eventType}, (${internalId})`
    );
    const event = await subEvent.getEventCompetition({
      transaction: this.transaction,
    });
    const subEventEntries = await subEvent.getEventEntries({
      transaction: this.transaction,
    });

    const drawEntries = await draw.getEventEntries({
      transaction: this.transaction,
    });

    const xmlDraw = await this.visualService.getDraw(this.visualTournament.Code, internalId);
    const xmlDrawClubs = await this.visualService.getClubs(this.visualTournament.Code);

    if (!xmlDraw) {
      return;
    }

    if (!isArray(xmlDraw.Structure.Item)) {
      xmlDraw.Structure.Item = [xmlDraw.Structure.Item as XmlItem];
    }

    // get the teams for the draw
    const teams = new Set<string>(
      xmlDraw.Structure.Item?.map((item) => item.Team?.Name)?.filter(
        (name): name is string => name?.length > 0
      ) ?? []
    );

    for (const item of teams) {
      const team = await this._getTeam(
        item,
        event.season,
        event.state,
        event.teamMatcher,
        event.type,
        drawEntries?.map((r) => r.teamId ?? "") ?? [],
        subEventEntries.map((r) => r.teamId ?? "") ?? [],
        xmlDrawClubs
      );

      if (!team) {
        this.logger.warn(`Team not found ${item}`);
        continue;
      }

      let entry = subEventEntries.find((r) => r.teamId === team?.id);

      if (!entry) {
        this.logger.warn(`team entry not found ${team.name}`);
        entry = await new EventEntry({
          teamId: team.id,
          subEventId: subEvent.id,
          date: new Date(event.season, 0, 1),
        }).save({ transaction: this.transaction });
      }

      this.logger.debug(`Processing entry ${item} - ${team.name}`);

      // Check if we're before the start of the season (Septemeber 1st of the season) and if entry data needs updating
      const seasonStart = moment([event.season, 8, 1]); // September 1st of the season
      const currentDate = moment();

      if (currentDate.isBefore(seasonStart)) {
        this.logger.debug(`Before season start, checking team data for ${team.name}`);
        await this._updateTeamDataFromVisual(team, entry, internalId);
      }

      await entry.setDrawCompetition(draw, {
        transaction: this.transaction,
      });
      await entry.setTeam(team, {
        transaction: this.transaction,
      });

      entry.team = team;
      this._entries.push({ entry, xmlTeamName: item });
    }

    const entries = await draw.getEventEntries({
      transaction: this.transaction,
      include: [{ model: Team }],
    });

    // remove entries where the team is of the wrong season
    for (const entry of entries) {
      if (entry.team?.season !== event.season) {
        this.logger.warn(
          `Team existed multiple season ${entry.team?.name} (${entry.team?.season})`
        );
        await entry.destroy({ transaction: this.transaction });

        this._entries = this._entries.filter((e) => e.entry.id !== entry.id);
      }
    }
    // remove all entries that don't exist in _entries
    for (const entry of entries) {
      if (!this._entries.find((e) => e.entry.id === entry.id)) {
        this.logger.warn(`Entry existed but was removed`);
        await entry.destroy({ transaction: this.transaction });

        this._entries = this._entries.filter((e) => e.entry.id !== entry.id);
      }
    }
  }

  private async _getClubByNumber(clubNumber: string | number): Promise<Club | null> {
    const parsedNumber = typeof clubNumber === "string" ? parseInt(clubNumber, 10) : clubNumber;
    if (isNaN(parsedNumber)) {
      return null;
    }

    const club = await Club.findOne({
      where: { clubId: parsedNumber },
      transaction: this.transaction,
    });

    return club;
  }

  private async _getPossibleClubs(clubName: string, state?: string) {
    const clubs = await Club.findAll({
      where: {
        [Op.or]: [
          {
            name: {
              [Op.iLike]: clubName,
            },
          },
          {
            fullName: {
              [Op.iLike]: clubName,
            },
          },
          {
            abbreviation: {
              [Op.iLike]: clubName,
            },
          },
          {
            teamName: {
              [Op.iLike]: clubName,
            },
          },
        ],
      },
      transaction: this.transaction,
    });

    if (clubs.length === 1) {
      return [clubs[0]];
    } else if (clubs.length > 1) {
      // try find club from same state
      const club = clubs.find((r) => r.state === state);
      if (club) {
        this.logger.debug(
          `Multiple clubs found ${clubName}, picking the club with state ${state}, club's state ${club?.state}`
        );
        return [club];
      }
    } else {
      this.logger.warn(`Club not found by name ${clubName}`);
    }

    return clubs;
  }

  private async _getTeam(
    item: string,
    season: number,
    state?: string,
    teamMatcher?: string,
    type?: LevelType,
    drawTeamIds?: string[],
    subEventTeamIds?: string[],
    xmlDrawClubs?: XmlClub[]
  ) {
    const name = correctWrongTeams({ name: item })?.name;
    const { clubName, teamNumber, teamType } = teamValues(name, teamMatcher, type);

    const matchingXmlClubs = xmlDrawClubs?.filter((r) => {
      const normalizedXmlName = r.Name?.toLowerCase().trim();
      const normalizedClubName = clubName?.toLowerCase().trim();
      return (
        normalizedXmlName === normalizedClubName ||
        normalizedXmlName?.includes(normalizedClubName) ||
        normalizedClubName?.includes(normalizedXmlName)
      );
    });

    let club: Club | null = null;

    if (matchingXmlClubs?.length === 1 && matchingXmlClubs[0].Number) {
      club = await this._getClubByNumber(matchingXmlClubs[0].Number);
      if (club) {
        this.logger.debug(
          `Found club by number: ${club.name} (clubId: ${matchingXmlClubs[0].Number}) for team ${name}`
        );
      }
    } else if (matchingXmlClubs && matchingXmlClubs.length > 1) {
      const matchingByState = matchingXmlClubs.find(
        (c) => c.State?.toLowerCase() === state?.toLowerCase()
      );
      if (matchingByState?.Number) {
        club = await this._getClubByNumber(matchingByState.Number);
        if (club) {
          this.logger.debug(
            `Found club by number (disambiguated by state): ${club.name} (clubId: ${matchingByState.Number}) for team ${name}`
          );
        }
      }
    }

    if (!club) {
      const verifiedClubName = matchingXmlClubs?.length === 1 ? matchingXmlClubs[0].Name : clubName;

      this.logger.debug(
        `Team name: ${name}, Club name: ${clubName}, Team number: ${teamNumber}, Team type: ${teamType}, verifiedClubName: ${verifiedClubName}`
      );

      const clubs = await this._getPossibleClubs(verifiedClubName, state);

      if (!clubs || clubs.length === 0) {
        this.logger.warn(`Club not found ${clubName} ${state}`);
        return;
      }

      if (clubs.length === 1) {
        club = clubs[0];
      } else {
        return this._findTeamInClubs(
          clubs,
          teamType,
          teamNumber,
          season,
          name,
          drawTeamIds,
          subEventTeamIds
        );
      }
    }

    if (!club) {
      this.logger.warn(`Club not found ${clubName} ${state}`);
      return;
    }

    return this._findOrCreateTeamForClub(
      club,
      teamType,
      teamNumber,
      season,
      name,
      drawTeamIds,
      subEventTeamIds
    );
  }

  private async _findTeamInClubs(
    clubs: Club[],
    teamType: SubEventTypeEnum,
    teamNumber: number | undefined,
    season: number,
    name: string,
    drawTeamIds?: string[],
    subEventTeamIds?: string[]
  ): Promise<Team | undefined> {
    let where: WhereOptions = {
      clubId: clubs.map((r) => r.id),
      type: teamType,
    };

    if (teamNumber) {
      where = { ...where, teamNumber };
    }

    const teams = await Team.findAll({
      where,
      transaction: this.transaction,
    });

    if ((drawTeamIds?.length ?? 0) > 0) {
      const t = teams.filter((r) => drawTeamIds?.includes(r.id));
      if (t.length === 1) {
        return t[0];
      }
    }

    const teamsForSeason = teams.filter((r) => r.season === season);
    const teamsForSeasonAndName = teamsForSeason.filter((r) => r.name === name);
    if (teamsForSeasonAndName.length === 1) {
      return teamsForSeasonAndName[0];
    }

    if ((subEventTeamIds?.length ?? 0) > 0) {
      const t = teams.filter((r) => subEventTeamIds?.includes(r.id));
      if (t.length === 1) {
        return t[0];
      }
    }

    if (teamsForSeason.length === 1) {
      return teamsForSeason[0];
    }

    this.logger.warn(`Could not determine unique team from ${clubs.length} clubs for ${name}`);
    return undefined;
  }

  private async _findOrCreateTeamForClub(
    club: Club,
    teamType: SubEventTypeEnum,
    teamNumber: number | undefined,
    season: number,
    name: string,
    drawTeamIds?: string[],
    subEventTeamIds?: string[]
  ): Promise<Team | undefined> {
    let where: WhereOptions = {
      clubId: club.id,
      type: teamType,
    };

    if (teamNumber) {
      where = { ...where, teamNumber };
    }

    const teams = await Team.findAll({
      where,
      transaction: this.transaction,
    });

    if ((drawTeamIds?.length ?? 0) > 0) {
      const t = teams.filter((r) => drawTeamIds?.includes(r.id));
      if (t.length === 1) {
        return t[0];
      }
    }

    const teamsForSeason = teams.filter((r) => r.season === season);
    const teamsForSeasonAndName = teamsForSeason.filter((r) => r.name === name);
    if (teamsForSeasonAndName.length === 1) {
      return teamsForSeasonAndName[0];
    }

    if ((subEventTeamIds?.length ?? 0) > 0) {
      const t = teams.filter((r) => subEventTeamIds?.includes(r.id));
      if (t.length === 1) {
        return t[0];
      }
    }

    if (teamsForSeason.length === 1) {
      return teamsForSeason[0];
    }

    const teamsWithSameName = teams?.filter((r) => r.name === name);
    if (teamsWithSameName?.length === 1) {
      this.logger.debug(`Creating new team for season ${season} based on existing team ${name}`);
      return new Team({
        type: teamType,
        teamNumber: teamNumber,
        season: season,
        clubId: club.id,
        link: teamsWithSameName[0].link,
      }).save({ transaction: this.transaction });
    }

    // Create a new team
    this.logger.debug(`Creating new team ${club.name} ${teamNumber} ${teamType}`);
    return new Team({
      type: teamType,
      teamNumber: teamNumber,
      season: season,
      clubId: club.id,
    }).save({ transaction: this.transaction });
  }

  private async _updateTeamDataFromVisual(team: Team, entry: EventEntry, drawId: number) {
    try {
      const xmlDraw = await this.visualService.getDraw(this.visualTournament.Code, drawId);
      if (!xmlDraw?.Structure?.Item) {
        return;
      }

      const items = isArray(xmlDraw.Structure.Item)
        ? xmlDraw.Structure.Item
        : [xmlDraw.Structure.Item as XmlItem];

      const teamItem = items.find(
        (item) => item.Team?.Name?.indexOf(team.name) !== -1 && item.Team?.Code
      );
      if (!teamItem?.Team?.Code) {
        this.logger.warn(`Team code not found for ${team.name} in draw structure`);
        return;
      }

      const xmlTeam = await this.visualService.getTeam(
        this.visualTournament.Code,
        teamItem.Team.Code
      );

      if (!xmlTeam) {
        this.logger.warn(`No team data found for team code ${teamItem.Team.Code}`);
        return;
      }

      let teamUpdated = false;

      if (xmlTeam.Contact && `${xmlTeam.Contact}`.trim() !== "" && xmlTeam.Contact !== team.name) {
        this.logger.debug(`Team contact: ${xmlTeam.Contact}`);
      }

      if (xmlTeam.Phone && `${xmlTeam.Phone}`.trim() !== "" && xmlTeam.Phone !== team.phone) {
        team.phone = xmlTeam.Phone;
        teamUpdated = true;
        this.logger.debug(`Updated team phone for ${team.name}: ${xmlTeam.Phone}`);
      }

      if (xmlTeam.Email && `${xmlTeam.Email}`.trim() !== "" && xmlTeam.Email !== team.email) {
        team.email = xmlTeam.Email;
        teamUpdated = true;
        this.logger.debug(`Updated team email for ${team.name}: ${xmlTeam.Email}`);
      }

      if (teamUpdated) {
        await team.save({ transaction: this.transaction });
        this.logger.debug(`Updated team data for ${team.name}`);
      }

      const players = xmlTeam.Players?.Player;

      if (players && players.length > 0) {
        this.logger.debug(
          `Using Visual API player data for team ${team.name} (${players.length} players)`
        );

        const memberIds = players.map((p) => p.MemberID).filter((id) => id);
        const dbPlayers = await Player.findAll({
          where: {
            memberId: {
              [Op.in]: memberIds,
            },
          },
          include: [
            {
              association: "rankingPlaces",
              limit: 1,
              order: [["rankingDate", "DESC"]],
            },
          ],
          transaction: this.transaction,
        });

        const existingMeta = entry.meta || {};
        const existingPlayersMeta = existingMeta.competition?.players || [];

        const entryMeta = {
          ...existingMeta,
          competition: {
            ...existingMeta.competition,
            players: players.map((xmlPlayer) => {
              const dbPlayer = dbPlayers.find((p) => p.memberId === xmlPlayer.MemberID);

              const existingPlayerMeta = existingPlayersMeta.find((p) => p.id === dbPlayer?.id);

              const ranking = dbPlayer?.rankingPlaces?.[0];

              return {
                id: dbPlayer?.id || undefined,
                gender: (xmlPlayer.GenderID === 1 ? "M" : "F") as "M" | "F",
                single: ranking?.single || 12, // Use current ranking
                double: ranking?.double || 12,
                mix: ranking?.mix || 12,
                levelException: existingPlayerMeta?.levelException || false, // Preserve existing exceptions
                levelExceptionRequested: existingPlayerMeta?.levelExceptionRequested || false,
                levelExceptionReason: existingPlayerMeta?.levelExceptionReason || undefined,
              };
            }),
          },
        };

        // Update entry meta with Visual API data
        entry.meta = entryMeta;
        await entry.save({ transaction: this.transaction });

        this.logger.debug(
          `Updated entry meta with Visual API data: ${players.length} players for team ${team.name}`
        );
      } else {
        // PRIORITY 2: Keep existing database data if Visual API has no player data
        const existingMeta = entry.meta;

        if (existingMeta?.competition?.players && existingMeta.competition.players.length > 0) {
          this.logger.debug(
            `No Visual API player data for team ${team.name}, keeping existing database data (${existingMeta.competition.players.length} players)`
          );
          // Do nothing - keep existing data as is
        } else {
          // PRIORITY 3: Do nothing if neither Visual API nor database has player data
          this.logger.debug(
            `No player data available for team ${team.name} from Visual API or database`
          );
          // Do nothing
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update team data from visual for ${team.name}: ${error}`);
    }
  }
}
