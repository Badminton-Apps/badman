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
  private cacheTimeout = 300000; // 5 minutes cache (increased from 30 seconds)
  private lastCacheTime = 0;

  // Add data caching to prevent expensive fetchData calls
  private dataCache: Map<string, { data: T; timestamp: number }> = new Map();
  private dataCacheTimeout = 60000; // 1 minute cache for data

  // Add validation result caching
  private validationCache: Map<string, { result: any; timestamp: number }> = new Map();
  private validationCacheTimeout = 30000; // 30 seconds cache for validation results

  abstract onApplicationBootstrap(): Promise<void>;
  abstract group: string;

  abstract fetchData(args?: unknown): Promise<T>;

  private async getCachedData(args: unknown): Promise<T> {
    const cacheKey = this.generateDataCacheKey(args);
    const cachedData = this.dataCache.get(cacheKey);

    if (cachedData && this.isDataCacheValid(cachedData.timestamp)) {
      return cachedData.data;
    }

    // Fetch fresh data
    const data = await this.fetchData(args);

    // Cache the data
    this.dataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup expired caches periodically
    if (Math.random() < 0.1) {
      // 10% chance to cleanup on each call
      this.cleanupExpiredCaches();
    }

    return data;
  }

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
    this.dataCache.clear();
    this.validationCache.clear();
    this.lastCacheTime = 0;
  }

  private generateDataCacheKey(args: unknown): string {
    return JSON.stringify(args);
  }

  private generateValidationCacheKey(
    args: unknown,
    runFor?: { playerId?: string; teamId?: string; clubId?: string }
  ): string {
    return JSON.stringify({ args, runFor });
  }

  private isDataCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.dataCacheTimeout;
  }

  private isValidationCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.validationCacheTimeout;
  }

  private cleanupExpiredCaches(): void {
    const now = Date.now();

    // Clean up data cache
    for (const [key, value] of this.dataCache.entries()) {
      if (now - value.timestamp >= this.dataCacheTimeout) {
        this.dataCache.delete(key);
      }
    }

    // Clean up validation cache
    for (const [key, value] of this.validationCache.entries()) {
      if (now - value.timestamp >= this.validationCacheTimeout) {
        this.validationCache.delete(key);
      }
    }
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
    // Check validation cache first
    const validationCacheKey = this.generateValidationCacheKey(args, runFor);
    const cachedValidation = this.validationCache.get(validationCacheKey);

    if (cachedValidation && this.isValidationCacheValid(cachedValidation.timestamp)) {
      return cachedValidation.result;
    }

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

    // fetch data using cache
    const data = await this.getCachedData(args);

    // get all errors and warnings from the validators in parallel
    const results = await Promise.all(validators.map((v) => v.validate(data)));

    const errors = results
      ?.map((r) => r.errors)
      ?.flat(1)
      ?.filter((e) => !!e) as V[];
    const warnings = results
      ?.map((r) => r.warnings)
      ?.flat(1)
      ?.filter((e) => !!e) as V[];

    const result = {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      validators: validators?.map((v) => v.constructor.name),
      ...(data as T),
    };

    // Cache the validation result
    this.validationCache.set(validationCacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }
}
