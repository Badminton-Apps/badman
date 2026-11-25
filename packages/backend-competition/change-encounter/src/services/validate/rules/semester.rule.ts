import { EncounterCompetition } from "@badman/backend-database";
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from "../../../models";
import { Rule } from "./_rule.base";
import { Logger } from "@nestjs/common";

export type SemesterRuleParams = {
  encounterId: string;
  date?: Date;
  teamName?: string;
  semester?: string;
  season?: number;
  currentSemester?: string;
  suggestedSemester?: string;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class SemesterRule extends Rule {
  static override readonly description = "all.rules.change-encounter.semseter";

  private readonly logger = new Logger(SemesterRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<SemesterRuleParams>[];
    const warnings = [] as EncounterValidationError<SemesterRuleParams>[];
    const valid = true;
    const {
      encountersSem1,
      encountersSem2,
      suggestedDates,
      encounter,
      season,
      semseter1,
      index: _index,
    } = changeEncounter;

    // Only check current state when no date change is being proposed.
    // During a swap, the current state may temporarily be wrong (both encounters
    // in the same semester), so skip this check when the user is proposing dates.
    if (!suggestedDates || suggestedDates.length === 0) {
      const error = this.findEncounterInSemseter(
        semseter1 ? encountersSem1 : encountersSem2,
        encounter
      );

      if (error) {
        errors.push({
          message: "all.competition.change-encounter.errors.same-semester",
          params: {
            encounterId: encounter.id,
            teamName: encounter.home?.name || encounter.away?.name,
            semester: semseter1 ? "first" : "second",
            season: season,
          },
        });
      }
    }

    // For proposed dates, check whether the proposed date would land in the same
    // semester as the reverse encounter (which is what we want to prevent).
    // Note: this correctly handles swaps — if the reverse encounter is in semester 1
    // and the user proposes semester 2, there is no conflict.
    if (suggestedDates && encounter) {
      for (const suggestedDate of suggestedDates) {
        const suggestedSemester1 = suggestedDate.date.getFullYear() === season;

        const conflictInProposedSemester = this.findEncounterInSemseter(
          suggestedSemester1 ? encountersSem1 : encountersSem2,
          encounter
        );

        if (conflictInProposedSemester) {
          warnings.push({
            message: "all.competition.change-encounter.errors.same-semester-date",
            params: {
              encounterId: encounter.id,
              date: suggestedDate.date,
              currentSemester: semseter1 ? "first" : "second",
              suggestedSemester: suggestedSemester1 ? "first" : "second",
              teamName: encounter.home?.name || encounter.away?.name,
            },
          });
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }
  findEncounterInSemseter(encounters: EncounterCompetition[], encounter: EncounterCompetition) {
    if (!encounters) {
      return false;
    }

    const sameEncounter = encounters.find(
      (e) => e.homeTeamId === encounter.awayTeamId && e.awayTeamId === encounter.homeTeamId
    );

    return (sameEncounter && sameEncounter.id !== encounter.id) || false;
  }
}
