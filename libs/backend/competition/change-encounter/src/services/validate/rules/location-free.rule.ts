import { EncounterCompetition, Location } from '@badman/backend-database';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export type LocationRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if there are enough locations available for the encounters
 * 
 * TODO: locationId's are wrong, check why
 */
export class LocationRule extends Rule {
  private readonly logger = new Logger(LocationRule.name);

  async validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput> {
    this.logger.verbose('Validating exception rule');
    const errors = [] as ChangeEncounterValidationError<LocationRuleParams>[];
    const warnings = [] as ChangeEncounterValidationError<LocationRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, suggestedDates, workingencounterId, locations } =
      changeEncounter;

    (await this.checkifLocationIsFree(encountersSem1, locations))?.map((r) => warnings.push(r));
    (await this.checkifLocationIsFree(encountersSem2, locations))?.map((r) => warnings.push(r));

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
        if (moment(suggestedDate).isSame(encounter.date, 'minute')) {
          // if the suggested date is the same as the current date, we can skip this
          continue;
        }

        encounter.date = suggestedDate;
        const warning = await this.checkifLocationIsFree([encounter], locations, true);
        warnings.push(...warning);
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  async checkifLocationIsFree(
    encounters: EncounterCompetition[],
    locations: Location[],
    isSuggested = false,
  ) {
    const errors: ChangeEncounterValidationError<LocationRuleParams>[] = [];

    if (!locations) {
      return errors;
    }

    for (const enc of encounters) {
      let count = await EncounterCompetition.count({
        where: {
          locationId: enc.locationId,
          date: enc.date,
        },
      });

      if (isSuggested) {
        count++;
      }

      const location = locations.find((r) => r.id === enc.locationId);

      let slot = null;

      for (const availability of location?.availabilities ?? []) {
        const filteredDays = availability.days?.filter(
          (r) => r.day === moment(enc.date).format('dddd').toLowerCase(),
        );

        // any day can have multipple slots, check in which slot the encounter is by checking start and endtime of the day against the encounter da
        const filteredSlots = filteredDays?.find(
          (r) => moment(enc.date).format('HH:mm') == r.startTime,
        );

        if (filteredSlots != null && !slot) {
          slot = filteredSlots;
        }
      }

      if (slot) {
        if (count > (slot?.courts ?? 0) / 2) {
          errors.push({
            message: 'all.competition.change-encounter.errors.location-not-free',
            params: {
              encounterId: enc.id,
              date: enc.date,
            },
          });
        }
      } else {
        errors.push({
          message: 'all.competition.change-encounter.errors.location-no-timeslot',
          params: {
            encounterId: enc.id,
            date: enc.date,
          },
        });
      }
    }

    return errors.flat();
  }
}
