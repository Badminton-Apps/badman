import { EncounterCompetition, Location, Team } from '@badman/backend-database';
import { ValidationService } from '@badman/backend-validation';
import { Logger } from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from '../../models';
import { DatePeriodRule, ExceptionRule, LocationRule, SemesterRule, TeamClubRule } from './rules';

export class EncounterValidationService extends ValidationService<
  EncounterValidationData,
  EncounterValidationError<unknown>
> {
  override group = 'change-encounter';

  private readonly _logger = new Logger(EncounterValidationService.name);

  override async onApplicationBootstrap() {
    this._logger.log('Initializing rules');
    await this.clearRules();

    await this.registerRule(SemesterRule);
    await this.registerRule(DatePeriodRule);
    await this.registerRule(TeamClubRule);
    await this.registerRule(ExceptionRule);
    await this.registerRule(LocationRule, { activated: false });

    this._logger.log('Rules initialized');
  }

  override async fetchData(args: {
    teamId: string;
    encounterId?: string;
    suggestedDates?: {
      date: Date;
      locationId: string;
    }[];
  }): Promise<EncounterValidationData> {
    // get encounters for the team
    const encounter = await EncounterCompetition.findByPk(args.encounterId, {
      attributes: ['id', 'date', 'drawId', 'locationId', 'homeTeamId', 'awayTeamId'],
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

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    const draw = await encounter.getDrawCompetition({
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

    const encounters = await draw.getEncounterCompetitions({
      attributes: ['id', 'date', 'drawId', 'locationId', 'homeTeamId', 'awayTeamId'],
      order: [['date', 'DESC']],
      where: {
        // filter only on the teams currently changing
        [Op.or]: [
          {
            homeTeamId: encounter.homeTeamId,
          },
          {
            awayTeamId: encounter.homeTeamId,
          },
          {
            homeTeamId: encounter.awayTeamId,
          },
          {
            awayTeamId: encounter.awayTeamId,
          },
        ],
      },
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

    const season = Math.min(...encounters.map((r) => r.date?.getFullYear() ?? 0));
    const encountersSem1 = encounters.filter((r) => r.date?.getFullYear() === season);
    const encountersSem2 = encounters.filter((r) => r.date?.getFullYear() !== season);

    const indexSem1 = encountersSem1.findIndex((r) => r.id === encounter.id);
    const indexSem2 = encountersSem2.findIndex((r) => r.id === encounter.id);
    const semseter1 = indexSem1 > -1;
    const index = semseter1 ? indexSem1 : indexSem2;

    if (!encounter.locationId) {
      throw new Error('Encounter location not found');
    }
    const locationIds: string[] = [encounter.locationId];
    if (args.suggestedDates) {
      locationIds.push(...args.suggestedDates.map((r) => r.locationId));
    }

    const locations = await Location.findAll({
      attributes: ['id', 'name'],
      where: {
        id: locationIds,
      },
      include: [
        {
          association: 'availabilities',
          where: {
            season: season,
          },
        },
      ],
    });

    return {
      draw,
      locations,
      season,
      encountersSem1,
      encountersSem2,
      semseter1,
      index,

      encounter,
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
    args: {
      encounterId?: string;
      suggestedDates?: {
        date: Date;
        locationId: string;
      }[];
    },
    runFor?: { playerId?: string; teamId?: string; clubId?: string },
  ) {
    const data = await super.validate(args, runFor);

    return {
      valid: data.valid,
      errors: data.errors,
      warnings: data.warnings,
      validators: data.validators,
    } as EncounterValidationOutput;
  }
}
