import { Injectable, Logger } from '@nestjs/common';
import { AssemblyData, AssemblyOutput } from '../../models';
import {
  CompetitionStatusRule,
  PlayerGenderRule,
  PlayerMaxGamesRule,
  PlayerMinLevelRule,
  PlayerOrderRule,
  Rule,
  TeamBaseIndexRule,
  TeamClubBaseRule,
  TeamSubeventIndexRule,
} from './rules';

@Injectable()
export class EnrollmentService {
  private readonly _logger = new Logger(EnrollmentService.name);

  async getValidationData(systemId: string): Promise<AssemblyData> {
    return null;
  }

  /**
   * Validate the assembly
   *
   * @param assembly Assembly configuaration
   * @returns Whether the assembly is valid or not
   */
  async validate(
    assembly: AssemblyData,
    validators: Rule[]
  ): Promise<AssemblyOutput> {
    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(
      validators.map((v) => v.validate(assembly))
    );

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e);
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e);

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      systemId: assembly.system.id,
    };
  }

  async fetchAndValidate(
    data: {
      systemId: string;
      teamId: string;
      encounterId: string;

      single1?: string;
      single2?: string;
      single3?: string;
      single4?: string;

      double1?: string[];
      double2?: string[];
      double3?: string[];
      double4?: string[];

      subtitudes?: string[];
    },
    validators: Rule[]
  ) {
    const dbData = await this.getValidationData(data.systemId);
    return this.validate(dbData, validators);
  }

  static defaultValidators(): Rule[] {
    return [
      new PlayerOrderRule(),
      new TeamBaseIndexRule(),
      new TeamClubBaseRule(),
      new TeamSubeventIndexRule(),
      new CompetitionStatusRule(),
      new PlayerMinLevelRule(),
      new PlayerMaxGamesRule(),
      new PlayerGenderRule(),
    ];
  }
}
