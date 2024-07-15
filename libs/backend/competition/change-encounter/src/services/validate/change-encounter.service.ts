import { Injectable, Logger } from '@nestjs/common';
import { TeamClubRule, SemesterRule, DatePeriodRule } from './rules';
import { EncounterCompetition, Team } from '@badman/backend-database';
import { Op } from 'sequelize';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../models';
import { Rule } from './rules/_rule.base';

@Injectable()
export class ChangeEncounterValidationService {
  private readonly _logger = new Logger(ChangeEncounterValidationService.name);

  async getValidationData(
    teamId: string,
    workingencounterId?: string,
    suggestedDates?: Date[],
  ): Promise<ChangeEncounterValidationData> {
    const team = await Team.findByPk(teamId, {
      attributes: ['id', 'name', 'type', 'teamNumber', 'clubId', 'season'],
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // get encounters for the team
    const encounters = await EncounterCompetition.findAll({
      attributes: ['id', 'date'],
      where: {
        [Op.or]: [
          {
            homeTeamId: team.id,
          },
          {
            awayTeamId: team.id,
          },
        ],
      },
      order: [['date', 'DESC']],
      include: [
        {
          association: 'home',
          attributes: ['id', 'clubId'],
        },
        {
          association: 'away',
          attributes: ['id', 'clubId'],
        },
      ],
    });

    const lowestYear = Math.min(...encounters.map((r) => r.date?.getFullYear() || 0));
    const encountersSem1 = encounters.filter((r) => r.date?.getFullYear() === lowestYear);
    const encountersSem2 = encounters.filter((r) => r.date?.getFullYear() !== lowestYear);

    return {
      team,
      encountersSem1,
      encountersSem2,

      lowestYear,

      workingencounterId,
      suggestedDates,
    };
  }

  /**
   * Validate the ChangeEncounter
   *
   * @param changeEncounter ChangeEncounter configuaration
   * @returns Whether the ChangeEncounter is valid or not
   */
  async validate(
    changeEncounter: ChangeEncounterValidationData,
    validators: Rule[],
  ): Promise<ChangeEncounterOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(validators.map((v) => v.validate(changeEncounter)));

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e) as ChangeEncounterValidationError<unknown>[];
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e) as ChangeEncounterValidationError<unknown>[];

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  async fetchAndValidate(
    data: {
      teamId: string;
      workingencounterId?: string;
      suggestedDates?: Date[];
    },
    validators: Rule[],
  ) {
    const dbData = await this.getValidationData(
      data.teamId,
      data.workingencounterId,
      data.suggestedDates,
    );
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [new SemesterRule(), new DatePeriodRule(), new TeamClubRule()];
  }
}
