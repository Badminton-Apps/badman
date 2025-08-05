import { InfoEvent } from '@badman/backend-database';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import {
  EncounterValidationData,
  EncounterValidationError,
  EncounterValidationOutput,
} from '../../../models';
import { Rule } from './_rule.base';

export type ExceptionRuleParams = {
  encounterId: string;
  date?: Date;
  exceptionName?: string;
  exceptionStart?: string;
  exceptionEnd?: string;
  teamName?: string;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class ExceptionRule extends Rule {
  static override readonly description = 'all.rules.change-encounter.exceptions';
  private readonly logger = new Logger(ExceptionRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<ExceptionRuleParams>[];
    const warnings = [] as EncounterValidationError<ExceptionRuleParams>[];
    const valid = true;
    const { suggestedDates, encounter, draw } = changeEncounter;
    const infoEvents = draw?.subEventCompetition?.eventCompetition?.infoEvents ?? [];

    if (!encounter?.date) {
      throw new Error('No date provided');
    }

    const error = this.findEncountersOnExceptionDays(encounter.date, encounter.id, infoEvents);
    if (error.length) {
      errors.push(...error);
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter) {
      for (const suggestedDate of suggestedDates) {
        const warning = this.findEncountersOnExceptionDays(
          suggestedDate.date,
          encounter.id,
          infoEvents,
        );

        if (warning.length) {
          warnings.push(...warning);
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  findEncountersOnExceptionDays(encounteDate: Date, encounterId: string, infoEvents: InfoEvent[]) {
    const warms: EncounterValidationError<ExceptionRuleParams>[] = [];

    if (!infoEvents) {
      return warms;
    }

    for (const infoEvent of infoEvents) {
      if (!(infoEvent.allowCompetition ?? false)) {
        if (moment(encounteDate).isBetween(infoEvent.start, infoEvent.end, 'day', '[]')) {
          warms.push({
            message: 'all.competition.change-encounter.errors.exception-day',
            params: {
              encounterId: encounterId,
              date: encounteDate,
              exceptionName: infoEvent.name,
              exceptionStart: moment(infoEvent.start).format('DD/MM/YYYY'),
              exceptionEnd: moment(infoEvent.end).format('DD/MM/YYYY'),
            },
          });
        }
      }
    }

    return warms.flat();
  }
}
