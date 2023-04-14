import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentData, EnrollmentOutput } from '../../models';
import {
  CompetitionStatusRule,
  PlayerGenderRule,
  PlayerMinLevelRule,
  Rule,
  TeamBaseIndexRule,
  TeamSubeventIndexRule,
} from './rules';

@Injectable()
export class ValidationService {
  private readonly _logger = new Logger(ValidationService.name);

  async getValidationData(systemId: string): Promise<EnrollmentData> {
    return null;
  }

  /**
   * Validate the enrollment
   *
   * @param enrollment Enrollment configuaration
   * @returns Whether the enrollment is valid or not
   */
  async validate(
    enrollment: EnrollmentData,
    validators: Rule[]
  ): Promise<EnrollmentOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(
      validators.map((v) => v.validate(enrollment))
    );

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e);
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e);
    const valids = results
      ?.map((r) => r.valid)
      ?.flat(1)
      ?.filter((e) => !!e);

    // valids is an array for each team's validitiy per validator
    // if any of the validators return false, the team is invalid
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];
    for (const team of enrollment.teams) {
      const teamValid = valids?.filter((v) => v.teamId == team.team.id);
      valid.push({
        teamId: team.team.id,
        valid: teamValid?.every((v) => v.valid),
      });
    }

    return {
      errors: errors,
      warnings: warnings,
      valid,
    };
  }

  async fetchAndValidate(
    data: {
      systemId: string;
      teamId: string;
      subEventId: string;
    },
    validators: Rule[]
  ) {
    const dbData = await this.getValidationData(data.systemId);
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [
      new TeamBaseIndexRule(),
      new TeamSubeventIndexRule(),
      new CompetitionStatusRule(),
      new PlayerMinLevelRule(),
      new PlayerGenderRule(),
    ];
  }
}
