import { Club, EventEntry, Team } from '@badman/backend-database';
import { VisualService, XmlItem, XmlTournament } from '@badman/backend-visual';
import { runParrallel, teamValues } from '@badman/utils';
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
    await runParrallel(this.draws?.map((e) => this._processEntries(e)) ?? []);
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
      include: [{ model: Team }],
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
      const club = await Club.findOne({
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

      let entry = subEventEntries.find((r) => {
        if (!r.team) {
          return false;
        }

        return (
          r.team.teamNumber === teamNumber &&
          r.team.clubId === club?.id &&
          r.team.type === teamType
        );
      });

      if (!club) {
        this.logger.warn(`Club not found ${clubName}`);
        continue;
      }

      const where: { [key: string]: unknown } = {
        teamNumber: +teamNumber,
        type: teamType,
        clubId: club.id,
      };

      const foundTeams = await Team.findAll({
        where,
        transaction: this.transaction,
      });

      let team = foundTeams.find((r) => r.season === event.season);

      if (!team) {
        const clubTeams = await club.getTeams({
          where: {
            type: teamType,
            teamNumber: +teamNumber,
            season: event.season,
          },
          transaction: this.transaction,
        });

        if (clubTeams?.length > 0) {
          team = clubTeams[0];
        } else {
          let link: string | null = null;
          
          if (foundTeams?.length > 0) {
            link = foundTeams[0].link;
          }

          team = new Team({
            type: teamType,
            teamNumber: +teamNumber,
            season: event.season,
            clubId: club?.id,
            link: link ?? '',
          });
          await team.save({ transaction: this.transaction });

          // check if the found team
        }
      }

      await draw.getEntries({
        transaction: this.transaction,
      });

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
}
