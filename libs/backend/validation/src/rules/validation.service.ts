import { Rule } from '@badman/backend-database';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ValidationRule } from './_rule.base';
import { literal, Op } from 'sequelize';
import { run } from 'node:test';

type ruleType<T, V> = new () => ValidationRule<
  T,
  Partial<{
    valid: boolean;
    errors?: V[];
    warnings?: V[];
  }> &
    T
>;

@Injectable()
export abstract class ValidationService<T, V> implements OnModuleInit {
  private readonly logger = new Logger(ValidationService.name);
  private rules: Map<string, ruleType<T, V>> = new Map();

  abstract onModuleInit(): Promise<void>;
  abstract group: string;

  abstract fetchData(args?: unknown): Promise<T>;

  async registerRule(
    rule: ruleType<T, V>,
    description: string,
    args?: { meta?: object; activated?: boolean },
  ): Promise<void> {
    // find or create rule
    await Rule.findOrCreate({
      where: {
        group: this.group,
        name: rule.name, 
      },
      defaults: {
        group: this.group,
        name: rule.name,
        description: description,
        activated: args?.activated ?? false,
        meta: {
          activatedForUsers: [],
          activatedForTeams: [],
          activatedForClubs: [],

          deactivatedForUsers: [],
          deactivatedForTeams: [],
          deactivatedForClubs: [],
          ...(args?.meta ?? {}),
        },
      },
      
    });

    this.rules.set(`${this.group}_${rule.name}`, rule);
  }

  async clearRules(): Promise<void> {
    // await Rule.destroy({
    //   where: {
    //     group: this.group,
    //   },
    // });
    this.rules.clear();
  }

  async validate(
    args: unknown,
    runFor?: {
      playerId?: string;
      teamId?: string;
      clubId?: string;
    },
  ): Promise<
    Partial<{
      valid: boolean;
      errors?: V[];
      warnings?: V[];
    }> &
      T
  > {
    const configuredRules = await Rule.findAll({
      where: {
        [Op.or]: [
          {
            group: this.group,
            activated: true,
          },
          runFor?.playerId
            ? {
                group: this.group,
                activated: false,
                [Op.and]: [
                  literal(`"Rule"."meta"->'activatedForUsers' @> '"${runFor?.playerId}"'`),
                  literal(`NOT ("Rule"."meta"->'deactivatedForUsers' @> '"${runFor?.playerId}"')`),
                ],
              }
            : {},
          runFor?.teamId
            ? {
                group: this.group,
                activated: false,
                [Op.and]: [
                  literal(`"Rule"."meta"->'activatedForTeams' @> '"${runFor?.teamId}"'`),
                  literal(`NOT ("Rule"."meta"->'deactivatedForTeams' @> '"${runFor?.teamId}"')`),
                ],
              }
            : {},
          runFor?.clubId
            ? {
                group: this.group,
                activated: false,
                [Op.and]: [
                  literal(`"Rule"."meta"->'activatedForClubs' @> '"${runFor?.clubId}"'`),
                  literal(`NOT ("Rule"."meta"->'deactivatedForClubs' @> '"${runFor?.clubId}"')`),
                ],
              }
            : {},
        ],
      },
    });

    this.logger.verbose(`Found ${configuredRules.length} rules for group ${this.group}`);

    // fetch all rules for the group
    const validators = configuredRules.map((r) => {
      const rule = this.rules.get(`${this.group}_${r.name}`);

      if (!rule) {
        throw new Error(`Rule ${r.name} not found`);
      }

      return new rule();
    });

    // fetch data
    const data = await this.fetchData(args);

    // // get all errors and warnings from the validators in parallel
    const results = await Promise.all(validators.map((v) => v.validate(data)));

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e) as V[];
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e) as V[];

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      // valid: true,
      // errors: [],
      // warnings: [],
      ...(data as T),
    };
  }
}
