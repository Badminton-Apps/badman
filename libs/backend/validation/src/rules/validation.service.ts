import { Rule } from '@badman/backend-database';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ValidationRule } from './_rule.base';

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
  private rules: Map<string, ruleType<T, V>> = new Map();

  abstract onModuleInit(): Promise<void>;
  abstract group: string; 

  abstract fetchData(args?: unknown): Promise<T>;

  async registerRule(rule: ruleType<T, V>, description: string, meta?: unknown): Promise<void> {
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
        activated: false, 
        meta: meta ?? {},
      },
    });

    this.rules.set(`${this.group}_${rule.name}`, rule);
  }

  async validate(
    args: unknown,
    playerId?: string,
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
        group: this.group,
        activated: true,
      },
    });

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
