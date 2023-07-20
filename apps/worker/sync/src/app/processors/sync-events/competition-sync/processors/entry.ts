import { Club, EventEntry, Team } from '@badman/backend-database';
import { VisualService, XmlItem, XmlTournament } from '@badman/backend-visual';
import { SubEventTypeEnum, runParallel, teamValues } from '@badman/utils';
import { isArray } from 'class-validator';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { correctWrongTeams } from '../../../../utils';
import { DrawStepData } from './draw';
import { Logger } from '@nestjs/common';

export interface EntryStepData {
  entry: EventEntry;
  teamName: string;
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
      const { clubName, teamNumber, teamType } = teamValues(
        correctWrongTeams({ name: item })?.name
      );

      const club = await this._getClub(clubName, event.state);

      if (!club) {
        this.logger.warn(`Club not found ${clubName} ${event.state}`);
        continue;
      }

      const team = await this._getTeam(
        club,
        teamNumber,
        teamType,
        event.season
      );

      let entry = subEventEntries.find((r) => r.teamId === team?.id);

      if (!entry) {
        this.logger.warn(`Teams entry not found ${team.name}`);
        entry = await new EventEntry({
          teamId: team.id,
          subEventId: subEvent.id,
          date: new Date(event.season, 0, 1),
        }).save({ transaction: this.transaction });
      }

      this.logger.debug(`Processing entry ${item} - ${team.name}`);

      await entry.setDrawCompetition(draw, {
        transaction: this.transaction,
      });
      await entry.setTeam(team, {
        transaction: this.transaction,
      });

      entry.team = team;
      this._entries.push({ entry, teamName: item });
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

  private async _getClub(clubName: string, state?: string) {
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
    let club: Club | undefined;

    if (clubs.length === 1) {
      club = clubs[0];
    } else if (clubs.length > 1) {
      // try find club from same state
      club = clubs.find((r) => r.state === state);
      this.logger.debug(
        `Multiple clubs found ${clubName}, picking the club with state ${state}, club's state ${club?.state}`
      );
    } else {
      this.logger.warn(`Club not found ${clubName}`);
    }

    return club;
  }

  private async _getTeam(
    club: Club,
    teamNumber: number,
    teamType: SubEventTypeEnum,
    season: number
  ) {
    const clubTeams = await club.getTeams({
      transaction: this.transaction,
    });

    // try find for current season
    let team = clubTeams.find(
      (r) =>
        r.teamNumber === teamNumber &&
        r.type === teamType &&
        r.season === season
    );

    if (!team?.id) {
      // try find for previous season sorted with highest season first
      const preSeason = clubTeams
        .filter((r) => r.teamNumber === teamNumber && r.type === teamType)
        ?.sort((a, b) => (b.season ?? 0) - (a.season ?? 0));

      // create new team with previous season
      team = await new Team({
        clubId: club.id,
        teamNumber,
        type: teamType,
        season: season,
        link: preSeason?.[0]?.link,
      }).save({ transaction: this.transaction });
    }

    return team;
  }
}
