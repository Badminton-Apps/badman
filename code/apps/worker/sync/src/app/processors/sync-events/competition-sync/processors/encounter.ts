import {
  EncounterCompetition,
  EventCompetition,
  Game,
  Team,
} from '@badman/api/database';
import moment from 'moment';
import { Op } from 'sequelize';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService } from '../../../../services';
import {
  XmlTournament,
  XmlTeamMatch,
  correctWrongTeams,
} from '../../../../utils';
import { DrawStepData } from './draw';

export interface EncounterStepData {
  encounter: EncounterCompetition;
  internalId: number;
}

export interface EncounterStepOptions {
  newGames?: boolean;
}

export class CompetitionSyncEncounterProcessor extends StepProcessor {
  public event: EventCompetition;
  public draws: DrawStepData[];
  private _dbEncounters: EncounterStepData[] = [];
  private encounterOptions: EncounterStepOptions;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions & EncounterStepOptions
  ) {
    super(options);

    this.encounterOptions = options || {};
  }

  public async process(): Promise<EncounterStepData[]> {
    await Promise.all(this.draws.map((e) => this._processEncounters(e)));
    return this._dbEncounters;
  }

  private async _processEncounters({ draw, internalId }: DrawStepData) {
    const encounters = await draw.getEncounterCompetitions({
      transaction: this.transaction,
    });
    const canChange = moment().isBefore(`${this.event.startYear + 1}-01-01`);

    const visualMatches = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId,
      !canChange
    )) as XmlTeamMatch[];

    for (const xmlTeamMatch of visualMatches) {
      if (!xmlTeamMatch) {
        continue;
      }

      const matchDate = moment(xmlTeamMatch.MatchTime).toDate();
      const dbEncounters = encounters.filter(
        (r) => r.visualCode === `${xmlTeamMatch.Code}`
      );
      let dbEncounter: EncounterCompetition = null;

      if (dbEncounters.length === 1) {
        dbEncounter = dbEncounters[0];
      } else if (dbEncounters.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbEncounters;
        dbEncounter = first;

        this.logger.warn('Having multiple? Removing old');
        await this._destroyEncounters(rest);
      }

      const entries = await draw.getEntries({
        include: [{ model: Team }],
        transaction: this.transaction,
      });

      if (!dbEncounter) {
        const team1 = entries?.find(
          (e) =>
            e.team?.name ==
            correctWrongTeams({ name: xmlTeamMatch.Team1.Name }).name
        )?.team;

        const team2 = entries?.find(
          (e) =>
            e.team?.name ==
            correctWrongTeams({ name: xmlTeamMatch.Team2.Name }).name
        )?.team;

        // FInd one with same teams
        dbEncounter = encounters.find(
          (e) =>
            e.homeTeamId === team1?.id &&
            e.awayTeamId === team2?.id &&
            e.drawId === draw.id
        );

        if (!dbEncounter) {
          dbEncounter = await new EncounterCompetition({
            drawId: draw.id,
            visualCode: xmlTeamMatch.Code,
            date: matchDate,
            homeTeamId: team1?.id,
            awayTeamId: team2?.id,
          }).save({ transaction: this.transaction });
        } else {
          dbEncounter.visualCode = xmlTeamMatch.Code;
          await dbEncounter.save({ transaction: this.transaction });
        }
      }

      // Update date if needed
      if (dbEncounter.date !== matchDate) {
        dbEncounter.date = matchDate;
        await dbEncounter.save({ transaction: this.transaction });
      }

      // Check if encounter was before last run, skip if only process new events
      if (this.encounterOptions.newGames && dbEncounter.date < this.lastRun) {
        continue;
      }

      const team1 = entries?.find(
        (e) =>
          e.team?.name ==
          correctWrongTeams({ name: xmlTeamMatch.Team1.Name }).name
      )?.team;

      const team2 = entries?.find(
        (e) =>
          e.team?.name ==
          correctWrongTeams({ name: xmlTeamMatch.Team2.Name }).name
      )?.team;

      // Set teams if undefined (should not happen)
      if (
        dbEncounter.awayTeamId == null ||
        dbEncounter.homeTeamId == null ||
        dbEncounter.awayTeamId !== team1?.id ||
        dbEncounter.awayTeamId !== team2?.id
      ) {
        dbEncounter.homeTeamId = team1?.id;
        dbEncounter.awayTeamId = team2?.id;
        await dbEncounter.save({ transaction: this.transaction });
      }

      this._dbEncounters.push({
        encounter: dbEncounter,
        internalId: parseInt(xmlTeamMatch.Code, 10),
      });
    }

    // Remove draw that are not in the xml
    const removedEncounters = encounters.filter((e) => e.visualCode == null);

    await this._destroyEncounters(removedEncounters);
  }

  private async _destroyEncounters(encounter: EncounterCompetition[]) {
    await Game.destroy({
      where: {
        linkType: 'competition',
        linkId: {
          [Op.in]: encounter.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });

    await EncounterCompetition.destroy({
      where: {
        id: {
          [Op.in]: encounter.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });
  }
}
