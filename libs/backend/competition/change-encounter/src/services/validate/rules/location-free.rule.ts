import {
  AvailabilityDay,
  EncounterChange,
  EncounterCompetition,
  Location,
} from '@badman/backend-database';
import { Logger } from '@nestjs/common';
import moment from 'moment-timezone';
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export type LocationRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if there are enough locations available for the encounters
 */
export class LocationRule extends Rule {
  static override readonly description = 'all.rules.change-encounter.location';
  private readonly logger = new Logger(LocationRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<LocationRuleParams>[];
    const warnings = [] as EncounterValidationError<LocationRuleParams>[];
    const valid = true;
    const { encounter, suggestedDates, locations } = changeEncounter;

    if (!encounter?.date) {
      return {
        valid,
        errors,
        warnings,
      };
    }

    if (!encounter?.locationId) {
      return {
        valid,
        errors,
        warnings,
      };
    }

    const { err, warn } = await this.checkifLocationIsFree(
      encounter.date,
      encounter.locationId,
      encounter.id,
      locations,
      false,
    );
    if (err.length) {
      errors.push(...err);
    }

    if (warn.length) {
      warnings.push(...warn);
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter) {
      for (const suggestedDate of suggestedDates) {
        if (moment(suggestedDate.date).isSame(encounter.date, 'minute')) {
          // if the suggested date is the same as the current date, we can skip this
          continue;
        }

        const { err, warn } = await this.checkifLocationIsFree(
          suggestedDate.date,
          suggestedDate.locationId,
          encounter.id,
          locations,
          true,
        );
        if (err.length) {
          warnings.push(...err);
        }
        if (warn.length) {
          warnings.push(...warn);
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  async checkifLocationIsFree(
    encounterDate: Date,
    locationId: string,
    encounterId: string,
    locations: Location[],
    isSuggested = false,
  ) {
    const err: EncounterValidationError<LocationRuleParams>[] = [];
    const warn: EncounterValidationError<LocationRuleParams>[] = [];

    if (!locations || !locationId) {
      return { err, warn };
    }

    const encsOnDayAndLocation = await EncounterCompetition.findAll({
      attributes: ['id'],
      where: {
        locationId: locationId,
        date: encounterDate,
      },
      include: [
        {
          attributes: ['id', 'accepted'],
          model: EncounterChange,
        },
      ],
    });

    // all encounters that are on this day and don't have a encounterChange.accepted == false
    let count = encsOnDayAndLocation.filter((r) => r.encounterChange?.accepted !== false).length;
    let countWithouteRplaced = encsOnDayAndLocation.length;

    if (isSuggested) {
      count++;
      countWithouteRplaced++;
    }

    const location = locations.find((r) => r.id === locationId);

    let slot: AvailabilityDay | null = null;

    for (const availability of location?.availabilities ?? []) {
      const tzDate = moment(encounterDate).tz('Europe/Brussels').locale('en');
      const tzDay = tzDate.format('dddd').toLowerCase();
      const tzTime = tzDate.format('HH:mm');

      const filteredDays = availability.days?.filter((r) => r.day === tzDay);
      const filteredSlots = filteredDays?.find((r) => r.startTime === tzTime);

      let isOnExceptionDay = false;
      for (const exception of availability.exceptions ?? []) {
        if (moment(encounterDate).isBetween(exception.start, exception.end, 'day', '[]')) {
          isOnExceptionDay = true;
        }
      }

      if (filteredSlots != null && !slot && !isOnExceptionDay) {
        slot = filteredSlots;
      }
    }

    if (slot) {
      if (count > (slot?.courts ?? 0) / 2) {
        err.push({
          message: 'all.competition.change-encounter.errors.location-not-free',
          params: {
            encounterId: encounterId,
            date: encounterDate,
          },
        });
      } else if (countWithouteRplaced > (slot?.courts ?? 0) / 2) {
        warn.push({
          message: 'all.competition.change-encounter.errors.location-not-free',
          params: {
            encounterId: encounterId,
            date: encounterDate,
          },
        });
      }
    } else {
      err.push({
        message: 'all.competition.change-encounter.errors.location-no-timeslot',
        params: {
          encounterId: encounterId,
          date: encounterDate,
        },
      });
    }

    return {
      err,
      warn,
    };
  }
}
