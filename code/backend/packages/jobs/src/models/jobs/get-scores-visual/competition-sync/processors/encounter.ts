import {
  correctWrongTeams,
  EncounterCompetition,
  EventCompetition,
  Game,
  LevelType,
  logger,
  SubEventType,
  Team,
  XmlTeamMatch,
  XmlTournament
} from '@badvlasim/shared';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { StepProcessor } from '@badvlasim/shared/utils/step-processor';
import { VisualService } from '../../../visualService';
import { DrawStepData } from './draw';

export interface EncounterStepData {
  encounter: EncounterCompetition;
  internalId: number;
}

export class CompetitionSyncEncounterProcessor extends StepProcessor {
  public event: EventCompetition;
  public draws: DrawStepData[];
  private _dbEncounters: EncounterStepData[] = [];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<EncounterStepData[]> {
    await Promise.all(this.draws.map((e) => this._processEncounters(e)));
    return this._dbEncounters;
  }

  private async _processEncounters({ draw, internalId }: DrawStepData) {
    const encounters = await draw.getEncounters({
      transaction: this.transaction
    });
    const visualMatches = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId
    )) as XmlTeamMatch[];

    for (const xmlTeamMatch of visualMatches) {
      if (!xmlTeamMatch) {
        continue;
      }
      const matchDate = moment(xmlTeamMatch.MatchTime).toDate();
      const dbEncounters = encounters.filter((r) => r.visualCode === `${xmlTeamMatch.Code}`);
      let dbEncounter = null;

      if (dbEncounters.length === 1) {
        dbEncounter = dbEncounters[0];
      } else if (dbEncounters.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbEncounters;
        dbEncounter = first;

        logger.warn('Having multiple? Removing old');
        await this._destroyEncounters(rest);
      }

      if (!dbEncounter) {
        const { team1, team2 } = await this._findTeams(xmlTeamMatch);

        // FInd one with same teams
        dbEncounter = encounters.find(
          (e) => e.homeTeamId === team1?.id && e.awayTeamId === team2?.id && e.drawId === draw.id
        );

        if (!dbEncounter) {
          dbEncounter = await new EncounterCompetition({
            drawId: draw.id,
            visualCode: xmlTeamMatch.Code,
            date: matchDate,
            homeTeamId: team1?.id,
            awayTeamId: team2?.id
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

      // Set teams if undefined (should not happen)
      if (dbEncounter.awayTeamId == null || dbEncounter.homeTeamId == null) {
        const { team1, team2 } = await this._findTeams(xmlTeamMatch);
        dbEncounter.homeTeamId = team1?.id;
        dbEncounter.awayTeamId = team2?.id;
        await dbEncounter.save({ transaction: this.transaction });
      }

      this._dbEncounters.push({
        encounter: dbEncounter,
        internalId: parseInt(xmlTeamMatch.Code, 10)
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
          [Op.in]: encounter.map((e) => e.id)
        }
      },
      transaction: this.transaction
    });

    await EncounterCompetition.destroy({
      where: {
        id: {
          [Op.in]: encounter.map((e) => e.id)
        }
      },
      transaction: this.transaction
    });
  }

  private async _findTeams(xmlTeamMatch: XmlTeamMatch) {
    // We only know about last years teams
    if (
      this.event.startYear >= 2021 &&
      (this.event.name === 'PBO competitie 2021-2022' ||
        this.event.name === 'PBA competitie 2021-2022' ||
        this.event.name === 'VVBBC interclubcompetitie 2021-2022' ||
        this.event.name === 'Limburgse interclubcompetitie 2021-2022' ||
        this.event.name === 'WVBF Competitie 2021-2022' ||
        this.event.name === 'Vlaamse interclubcompetitie 2021-2022' ||
        this.event.name === 'Victor League 2021-2022')
    ) {
      try {
        const team1 = await this._findTeam(xmlTeamMatch.Team1?.Name);
        const team2 = await this._findTeam(xmlTeamMatch.Team2?.Name);

        return { team1, team2 };
      } catch (e) {
        logger.warn(e, xmlTeamMatch);
        return { team1: null, team2: null };
      }
    } else {
      return { team1: null, team2: null };
    }
  }

  private async _findTeam(name: string) {
    let clubId;
    // Quickfixes for overlapping names
    if (this.event.name === 'PBA competitie 2021-2022') {
      if (name.toLowerCase().indexOf('poona') > -1) {
        clubId = '5fcb3107-42f1-453d-b71d-d6af334306a8';
      } else if (name.toLowerCase().indexOf('smash') > -1) {
        clubId = '74f76cb5-2155-4f37-b033-0dab95b97bf5';
      }
    } else if (this.event.name === 'PBO competitie 2021-2022') {
      if (name.toLowerCase().indexOf('temse') > -1) {
        clubId = 'a2e3d9e0-3fb2-4e5f-93d5-3fd2dd0a656d';
      }
    } else if (this.event.name === 'Vlaamse interclubcompetitie 2021-2022') {
      if (name.toLowerCase().indexOf('smash') > -1) {
        clubId = '395ac8e4-285f-4baf-a042-105767965006';
      } else if (name.toLowerCase().indexOf('dropshot') > -1) {
        clubId = 'c963e733-f106-42e1-805c-fbc9180e8f7a';
      } else if (name.toLowerCase().indexOf('olve') > -1) {
        clubId = '696fe2ff-dcad-47a0-bf8b-d41c40f77db3';
      }
    } else if (this.event.name === 'VVBBC interclubcompetitie 2021-2022') {
      if (name.toLowerCase().indexOf('dropshot') > -1) {
        clubId = 'db85e273-0cac-42a9-a573-bc4fa3cfacf9';
      }
    } else if (this.event.name === 'Limburgse interclubcompetitie 2021-2022') {
      if (name.toLowerCase().indexOf('smash') > -1) {
        clubId = '395ac8e4-285f-4baf-a042-105767965006';
      } else if (name.toLowerCase().indexOf('dropshot') > -1) {
        clubId = 'c963e733-f106-42e1-805c-fbc9180e8f7a';
      }
    }

    const teamName = correctWrongTeams({ name }).name;
    if (teamName === null || teamName === undefined) {
      logger.warn(`Team not filled`);
      return null;
    }

    const where: { [key: string]: unknown } = {
      name: {
        [Op.iLike]: teamName
      },
      active: true
    };
    if (clubId) {
      where.clubId = clubId;
    }
    const teams = await Team.findAll({ where, transaction: this.transaction });
    if (teams.length > 1) {
      logger.warn(`Found more than one team for ${teamName}`);
    }

    const team =
      (teams?.length ?? 0) === 0 ? await this._findTeamByRegex(teamName, clubId) : teams[0];

    if (team == null) {
      logger.warn(`Team ${name} not found`);
    }

    return team;
  }

  private async _findTeamByRegex(name: string, clubId: string | null) {
    // remove leading index for PBA
    // name = name.replace(/\(\d+\)/gim, '');

    const regexResult =
      /(?<club>.*)\ ((?<teamNumberFront>\d+)(?<teamTypeFront>[GHD]?)|(?<teamTypeBack>[GHD]?)(?<teamNumberBack>\d))/gim.exec(
        name
      );

    if (regexResult) {
      const teamNumber = parseInt(
        regexResult.groups?.teamNumberFront || regexResult.groups?.teamNumberBack,
        10
      );
      const getType = (type: string) => {
        if (this.event.type === LevelType.NATIONAL) {
          return SubEventType.NATIONAL;
        }
        switch (type?.toUpperCase()) {
          case 'G':
            return SubEventType.MX;
          case 'D':
            return SubEventType.F;
          case 'H':
            return SubEventType.M;

          default:
            logger.warn('no type?', name);
        }
      };

      const type = getType(regexResult.groups?.teamTypeFront || regexResult.groups?.teamTypeBack);

      const where: { [key: string]: unknown } = {
        name: {
          [Op.iLike]: `%${correctWrongTeams({ name: regexResult.groups?.club || name }).name}%`
        },
        teamNumber,
        type,
        active: true
      };
      if (clubId) {
        where.clubId = clubId;
      }

      const results = await Team.findAll({
        where,
        transaction: this.transaction
      });

      if (results.length === 1) {
        return results[0];
      } else if (results.length > 1) {
        // Stupid fix, but works.
        const sortedByLength = results
          .filter((r) => r.name.length > name.length)
          .sort((a, b) => a.name.length - b.name.length);

        logger.debug('Found multiple teams', {
          sortedByLength: sortedByLength.map((r) => r.name)
        });

        return sortedByLength[0];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}
