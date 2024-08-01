import { Rule } from '@badman/backend-database';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ValidationRule } from './_rule.base';

type ruleType<T, V> = new () => ValidationRule<
  T,
  Partial<{
    valid: boolean;
    errors?: V[];
    warnings?: V[];
  }> &
    Partial<T>
>;

@Injectable()
export abstract class ValidationService<T, V> implements OnApplicationBootstrap {
  private readonly logger = new Logger(ValidationService.name);
  private rules: Map<string, ruleType<T, V>> = new Map();

  abstract onApplicationBootstrap(): Promise<void>;
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
        activated: args?.activated ?? true,
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
      validators?: string[];
    }> &
      Partial<T>
  > {
    const configuredRules = await Rule.findAll({
      where: {
        group: this.group,
      },
    });

    const activatedRules = configuredRules.filter((r) => r.activated);

    configuredRules
      .filter((r) => !r.activated)
      .filter((r) => {
        const meta = r.meta as {
          activatedForUsers: string[];
          activatedForTeams: string[];
          activatedForClubs: string[];

          deactivatedForUsers: string[];
          deactivatedForTeams: string[];
          deactivatedForClubs: string[];
        };


        const containsId =
          ((runFor?.playerId && meta.activatedForUsers.includes(runFor.playerId)) ||
            (runFor?.teamId && meta.activatedForTeams.includes(runFor.teamId)) ||
            (runFor?.clubId && meta.activatedForClubs.includes(runFor.clubId))) ??
          false;

        const doesntContainsId =
          ((runFor?.playerId && meta.deactivatedForUsers.includes(runFor.playerId)) ||
            (runFor?.teamId && meta.deactivatedForTeams.includes(runFor.teamId)) ||
            (runFor?.clubId && meta.deactivatedForClubs.includes(runFor.clubId))) ??
          false;

        this.logger.verbose(
          `Rule ${r.name} activated for ${containsId} (player: ${runFor?.playerId}) and deactivated for ${doesntContainsId}, resulting in ${containsId && !doesntContainsId}`,
        );

        return containsId && !doesntContainsId;
      })
      .map((r) => {
        this.logger.verbose(`Activating rule ${r.name}`);

        return activatedRules.push(r);
      });

    this.logger.verbose(`Found ${activatedRules.length} rules for group ${this.group}`);

    // fetch all rules for the group
    const validators = activatedRules
      .filter((r) => this.rules.has(`${this.group}_${r.name}`))
      .map((r) => {
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
      validators: validators?.map((v) => v.constructor.name),
      // valid: true,
      // errors: [],
      // warnings: [],
      ...(data as T),
    };
  }
}
