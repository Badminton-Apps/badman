import { Logger } from '@nestjs/common';
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { getSeasonPeriod } from '@badman/utils';
import moment from 'moment';

export type DatePeriodRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if all encounters are in the correct period
 */
export class DatePeriodRule extends Rule {
  static override readonly description = 'all.rules.change-encounter.date-period';
  private readonly logger = new Logger(DatePeriodRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<DatePeriodRuleParams>[];
    const warnings = [] as EncounterValidationError<DatePeriodRuleParams>[];
    const valid = true;
    const { suggestedDates, encounter, season } = changeEncounter;
    const period = getSeasonPeriod(season);

    const err = this.isBetween(encounter.date, [...period], encounter.id);
    if (err) {
      errors.push(err);
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter) {
      const warns = suggestedDates.map((suggestedDate) =>
        this.isBetween(suggestedDate.date, [...period], encounter.id),
      );
      for (const warn of warns) {
        if (warn) {
          warnings.push(warn);
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  private isBetween(
    inputDate?: Date,
    period?: [string, string],
    encounterId?: string,
  ): EncounterValidationError<DatePeriodRuleParams> | null {
    if (!inputDate) {
      this.logger.warn('No date provided');
      return null;
    }

    if (!period) {
      this.logger.warn('No period provided');
      return null;
    }

    if (!encounterId) {
      this.logger.warn('No encounterId provided');
      return null;
    }

    const date = moment(inputDate);
    const isBetween = date.isBetween(period[0], period[1], 'day', '[]');

    if (!isBetween) {
      return {
        message: 'all.competition.change-encounter.errors.date-out-of-period',
        params: {
          encounterId,
          date: date.toDate(),
        },
      };
    }

    return null;
  }
}
