import { Club, EventEntry, Team } from '@badman/backend-database';
import { VisualService, XmlItem, XmlTournament } from '@badman/backend-visual';
import { runParallel, teamValues } from '@badman/utils';
import { Logger } from '@nestjs/common';
import { isArray } from 'class-validator';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { correctWrongTeams } from '../../../../utils';
import { DrawStepData } from './draw';

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
    options.logger =
      options.logger || new Logger(CompetitionSyncEntryProcessor.name);
    super(options);
  }

  public async process(): Promise<EntryStepData[]> {
    await runParallel(this.draws?.map((e) => this._processEntries(e)) ?? []);

    return this._entries;
  }

  private async _processEntries({ draw, internalId }: DrawStepData) {
    const subEvent = await draw.getSubEventCompetition({
      transaction: this.transaction,
    });
    this.logger.log(
      `Processing entries for draw ${draw.name} - ${subEvent.eventType}, (${internalId})`
    );
    const event = await subEvent.getEventCompetition({
      transaction: this.transaction,
    });
    const subEventEntries = await subEvent.getEventEntries({
      // include: [{ model: Team }],
      transaction: this.transaction,
    });

    const xmlDraw = await this.visualService.getDraw(
      this.visualTournament.Code,
      internalId
    );

    if (!xmlDraw) {
      return;
    }

    if (!isArray(xmlDraw.Structure.Item)) {
      xmlDraw.Structure.Item = [xmlDraw.Structure.Item as XmlItem];
    }

    // get the teams for the draw
    const teams = new Set(
      xmlDraw.Structure.Item?.map((item) => item.Team?.Name)?.filter(
        (name) => name?.length > 0
      ) ?? []
    );

    for (const item of teams) {
      const teams = await this._getTeam(
        item,
        event.season,
        event.state,
        subEventEntries.map((r) => r.teamId ?? '') ?? []
      );

      if (!teams) {
        this.logger.warn(`Team not found ${item}`);
        continue;
      }

      let entry = subEventEntries.find((r) => r.teamId === teams?.id);

      if (!entry) {
        this.logger.warn(`Teams entry not found ${teams.name}`);
        entry = await new EventEntry({
          teamId: teams.id,
          subEventId: subEvent.id,
          date: new Date(event.season, 0, 1),
        }).save({ transaction: this.transaction });
      }

      this.logger.debug(`Processing entry ${item} - ${teams.name}`);

      await entry.setDrawCompetition(draw, {
        transaction: this.transaction,
      });
      await entry.setTeam(teams, {
        transaction: this.transaction,
      });

      entry.team = teams;
      this._entries.push({ entry, xmlTeamName: item });
    }

    const entries = await draw.getEntries({
      transaction: this.transaction,
      include: [{ model: Team }],
    });

    // remove entries where the team is of the wrong season
    for (const entry of entries) {
      if (entry.team?.season !== event.season) {
        this.logger.log(
          `Team existed multiple times ${entry.team?.name} (${entry.team?.season})`
        );
        await entry.destroy({ transaction: this.transaction });

        this._entries = this._entries.filter((e) => e.entry.id !== entry.id);
      }
    }
    // remove all entries that don't exist in _entries
    for (const entry of entries) {
      if (!this._entries.find((e) => e.entry.id === entry.id)) {
        this.logger.log(`Entry existed but was removed`);
        await entry.destroy({ transaction: this.transaction });
      }
    }

    // remove all entries where a team is defined multiple times
    const uniqueIds = new Set(this._entries.map((e) => e.entry.teamId));

    for (const teamId of uniqueIds) {
      const entries = this._entries.filter((e) => e.entry.teamId === teamId);

      if (entries.length > 1) {
        this.logger.log(
          `Team existed multiple times ${entries[0].entry.team?.name}`
        );

        // remove all but the first entry
        for (const entry of entries.slice(1)) {
          await entry.entry.destroy({ transaction: this.transaction });
          this._entries = this._entries.filter(
            (e) => e.entry.id !== entry.entry.id
          );
        }
      }
    }
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
      this.logger.warn(`Club not found ${clubName}`);
    }

    return clubs;
  }

  private async _getTeam(
    item: string,
    season: number,
    state?: string,
    teamIds?: string[]
  ) {
    const { clubName, teamNumber, teamType } = teamValues(
      correctWrongTeams({ name: item })?.name
    );

    const clubs = await this._getPossibleClubs(clubName, state);

    if (!clubs) {
      this.logger.warn(`Club not found ${clubName} ${state}`);
      return;
    }

    const teams = await Team.findAll({
      where: {
        clubId: clubs.map((r) => r.id),
        teamNumber,
        type: teamType,
      },
      transaction: this.transaction,
    });

    // find the team where the id is in the teamIds
    if ((teamIds?.length ?? 0) > 0) {
      const team = teams.find((r) => teamIds?.includes(r.id));
      if (team) {
        return team;
      }
    }

    // find the team where the season is the same
    const teamsForSeason = teams.filter((r) => r.season === season);

    if (teamsForSeason.length === 1) {
      return teamsForSeason[0];
    } else if (teamsForSeason.length > 1) {
      // check if any team has the correct name
      const team = teamsForSeason.find(
        (r) => (r.name?.indexOf(clubName) ?? -1) > -1
      );
      if (team) {
        return team;
      }

      this.logger.warn(
        `Multiple teams found ${clubName} ${teamNumber} ${teamType}`
      );
    }
  }
}
