import { EncounterCompetition, Location, Team } from '@badman/backend-database';
import { ValidationService } from '@badman/backend-validation';
import { Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../models';
import { DatePeriodRule, ExceptionRule, LocationRule, SemesterRule, TeamClubRule } from './rules';

export class ChangeEncounterValidationService extends ValidationService<
  ChangeEncounterValidationData,
  ChangeEncounterValidationError<unknown>
> {
  override group = 'change-encounter';

  private readonly _logger = new Logger(ChangeEncounterValidationService.name);

  override async onApplicationBootstrap() {
    this._logger.log('Initializing rules');
    await this.clearRules();

    await this.registerRule(SemesterRule, SemesterRule.description);
    await this.registerRule(DatePeriodRule, DatePeriodRule.description);
    await this.registerRule(TeamClubRule, TeamClubRule.description);
    await this.registerRule(ExceptionRule, ExceptionRule.description);
    await this.registerRule(LocationRule, LocationRule.description, { activated: false });

    this._logger.log('Rules initialized');
  }

  override async fetchData(args: {
    teamId: string;
    workingencounterId?: string;
    suggestedDates?: Date[];
  }): Promise<ChangeEncounterValidationData> {
    const team = await Team.findByPk(args.teamId, {
      attributes: ['id', 'name', 'type', 'teamNumber', 'clubId', 'season'],
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // get encounters for the team
    const encounters = await EncounterCompetition.findAll({
      attributes: ['id', 'date', 'drawId', 'locationId'],
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

    if (encountersSem1.length === 0 || encountersSem2.length === 0) {
      throw new Error('Not enough encounters');
    }

    const draw = await encountersSem1[0].getDrawCompetition({
      attributes: ['id', 'name', 'subeventId'],
      include: [
        {
          association: 'subEventCompetition',
          attributes: ['id', 'name', 'eventId'],
          include: [
            {
              association: 'eventCompetition',
              attributes: ['id', 'name', 'infoEvents'],
            },
          ],
        },
      ],
    });

    const locations = await Location.findAll({
      attributes: ['id', 'name'],
      where: {
        id: encounters.map((r) => r.locationId)?.filter((r) => !!r) as string[],
      },
      include: [
        {
          association: 'availabilities',
          where: {
            season: team.season,
          },
        },
      ],
    });

    return {
      team,
      encountersSem1,
      encountersSem2,
      draw,
      locations,

      lowestYear,

      workingencounterId: args.workingencounterId,
      suggestedDates: args.suggestedDates,
    };
  }

  /**
   * Validate the ChangeEncounter
   *
   * @param changeEncounter ChangeEncounter configuaration
   * @returns Whether the ChangeEncounter is valid or not
   */
  override async validate(
    args: { teamId: string; workingencounterId?: string; suggestedDates?: Date[] },
    runFor?: { playerId?: string; teamId?: string; clubId?: string },
  ) {
    const data = await super.validate(args, runFor);

    return {
      valid: data.valid,
      errors: data.errors,
      warnings: data.warnings,
    } as ChangeEncounterOutput;
  }
}
