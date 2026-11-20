import { Logger } from "@nestjs/common";
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from "../../../models";
import { Rule } from "./_rule.base";
import {
  CalendarRange,
  competitionSeasonWindow,
  enrollmentSeason,
  isInCompetitionSeason,
} from "@badman/utils";
import moment from "moment";

export type DatePeriodRuleParams = {
  encounterId: string;
  date?: Date;
  season?: number;
  periodStart?: string;
  periodEnd?: string;
  teamName?: string;
};

/**
 * Checks if all encounters are in the correct period
 */
export class DatePeriodRule extends Rule {
  static override readonly description = "all.rules.change-encounter.date-period";
  private readonly logger = new Logger(DatePeriodRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<DatePeriodRuleParams>[];
    const warnings = [] as EncounterValidationError<DatePeriodRuleParams>[];
    const valid = true;
    const { suggestedDates, encounter, season } = changeEncounter;
    const effectiveSeason = season || enrollmentSeason();
    const period = competitionSeasonWindow(effectiveSeason);

    const err = this.isBetween(encounter.date, effectiveSeason, period, encounter.id);
    if (err) {
      errors.push(err);
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter) {
      const warns = suggestedDates.map((suggestedDate) => {
        // Check if the suggested date is the same as the current date
        if (moment(suggestedDate.date).isSame(encounter.date, "day")) {
          return {
            message: "all.competition.change-encounter.errors.same-date" as any,
            params: {
              encounterId: encounter.id,
              date: suggestedDate.date,
              currentDate: encounter.date,
            },
          } as EncounterValidationError<DatePeriodRuleParams>;
        }

        // Check if the suggested date is in the past
        if (moment(suggestedDate.date).isBefore(moment(), "day")) {
          return {
            message: "all.competition.change-encounter.errors.past-date" as any,
            params: {
              encounterId: encounter.id,
              date: suggestedDate.date,
              currentDate: moment().toDate(),
            },
          } as EncounterValidationError<DatePeriodRuleParams>;
        }

        return this.isBetween(suggestedDate.date, effectiveSeason, period, encounter.id);
      });
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
    inputDate: Date | undefined,
    season: number,
    period: CalendarRange,
    encounterId?: string
  ): EncounterValidationError<DatePeriodRuleParams> | null {
    if (!inputDate) {
      this.logger.warn("No date provided");
      return null;
    }

    if (!encounterId) {
      this.logger.warn("No encounterId provided");
      return null;
    }

    if (!isInCompetitionSeason(inputDate, season)) {
      const date = moment(inputDate);
      return {
        message: "all.competition.change-encounter.errors.date-out-of-period",
        params: {
          encounterId,
          date: date.toDate(),
          season: date.year(),
          periodStart: moment(period.from).format("DD/MM/YYYY"),
          periodEnd: moment(period.to).format("DD/MM/YYYY"),
        },
      };
    }

    return null;
  }
}
