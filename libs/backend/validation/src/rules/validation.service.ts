import { Rule, Team } from "@badman/backend-database";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ValidationRule } from "./_rule.base";

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
  private ruleCache: Map<string, Rule[]> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache
  private lastCacheTime = 0;

  abstract onApplicationBootstrap(): Promise<void>;
  abstract group: string;

  abstract fetchData(args?: unknown): Promise<T>;

  async registerRule(
    rule: ruleType<T, V>,
    args?: { meta?: object; activated?: boolean }
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
        description: rule.prototype.constructor.description,
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
    this.ruleCache.clear();
    this.lastCacheTime = 0;
  }

  async clearCache(): Promise<void> {
    this.ruleCache.clear();
    this.lastCacheTime = 0;
  }

  private async getCachedRules(): Promise<Rule[]> {
    const now = Date.now();
    const cacheKey = this.group;

    // Check if cache is still valid
    if (this.ruleCache.has(cacheKey) && now - this.lastCacheTime < this.cacheTimeout) {
      return this.ruleCache.get(cacheKey) || [];
    }

    // Fetch fresh rules from database
    const configuredRules = await Rule.findAll({
      where: {
        group: this.group,
      },
    });

    // Update cache
    this.ruleCache.set(cacheKey, configuredRules);
    this.lastCacheTime = now;

    return configuredRules;
  }

  async validate(
    args: unknown,
    runFor?: {
      playerId?: string;
      teamId?: string;
      clubId?: string;
    }
  ): Promise<
    Partial<{
      valid: boolean;
      errors?: V[];
      warnings?: V[];
      validators?: string[];
    }> &
      Partial<T>
  > {
    const configuredRules = await this.getCachedRules();

    // if we provide a team but no club we can fetch it
    if (runFor?.teamId && !runFor.clubId) {
      const team = await Team.findByPk(runFor.teamId, {
        attributes: ["clubId"],
      });
      runFor.clubId = team?.clubId;
    }

    const activatedRules = configuredRules.filter((r) => r.activated);

    for (const r of configuredRules
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

        return containsId && !doesntContainsId;
      })) {
      this.logger.debug(`Activating rule ${r.name}`);

      activatedRules.push(r);
    }

    this.logger.debug(`Found ${activatedRules.length} rules for group ${this.group}`);

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
