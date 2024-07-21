import { EncounterCompetition } from '@badman/backend-database';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Logger } from '@nestjs/common';
import { InfoEvent } from '@badman/frontend-models';
import moment from 'moment';

export type ExceptionRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class ExceptionRule extends Rule {
  private readonly logger = new Logger(ExceptionRule.name);

  async validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput> {
    this.logger.verbose('Validating exception rule');
    const errors = [] as ChangeEncounterValidationError<ExceptionRuleParams>[];
    const warnings = [] as ChangeEncounterValidationError<ExceptionRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, suggestedDates, workingencounterId, draw } =
      changeEncounter;
    const infoEvents = draw?.subEventCompetition?.eventCompetition?.infoEvents ?? [];

    this.findEncountersOnExceptionDays(encountersSem1, infoEvents).map((error) =>
      errors.push(error),
    );
    this.findEncountersOnExceptionDays(encountersSem2, infoEvents).map((error) =>
      errors.push(error),
    );

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && workingencounterId) {
      const indexSem1 = encountersSem1.findIndex((r) => r.id === workingencounterId);
      const indexSem2 = encountersSem2.findIndex((r) => r.id === workingencounterId);
      const semseter1 = indexSem1 > -1;
      const index = semseter1 ? indexSem1 : indexSem2;
      if (index == -1) {
        throw new Error('Working encounter not found');
      }

      const encounter = {
        ...(semseter1
          ? [...encountersSem1].splice(index, 1)[0]
          : [...encountersSem2].splice(index, 1)[0]
        ).toJSON(),
      } as EncounterCompetition;

      for (const suggestedDate of suggestedDates) {
        encounter.date = suggestedDate;
        const warning = this.findEncountersOnExceptionDays([encounter], infoEvents);
        warnings.push(...warning);
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  findEncountersOnExceptionDays(encounters: EncounterCompetition[], infoEvents: InfoEvent[]) {
    const errors: ChangeEncounterValidationError<ExceptionRuleParams>[] = [];

    if (!infoEvents) {
      return errors;
    }

    for (const infoEvent of infoEvents) {
      if (!(infoEvent.allowCompetition ?? false)) {
        for (const encounter of encounters) {
          if (moment(encounter.date).isBetween(infoEvent.start, infoEvent.end, 'day', '[]')) {
            errors.push({
              message: 'all.competition.change-encounter.errors.exception-day',
              params: {
                encounterId: encounter.id,
                date: encounter.date,
              },
            });
          }
        }
      }
    }

    return errors.flat();
  }
}
