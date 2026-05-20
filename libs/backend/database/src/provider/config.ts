import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SequelizeModuleOptions, SequelizeOptionsFactory } from "@nestjs/sequelize";
import { Model, ModelCtor } from "sequelize-typescript";
import * as sequelizeModels from "../models";
import { ConfigType } from "@badman/utils";

@Injectable()
export class SequelizeConfigProvider implements SequelizeOptionsFactory {
  private readonly logger = new Logger(SequelizeConfigProvider.name);
  constructor(private readonly configService: ConfigService<ConfigType>) {}

  async createSequelizeOptions(): Promise<SequelizeModuleOptions> {
    const env = this.configService.get<"production" | "development" | "test" | "staging">("NODE_ENV");

    this.logger.log(`Loading ${env} config`);

    const models = Object.values(sequelizeModels).filter(
      (m) => typeof m === "function" && m.prototype instanceof Model
    ) as ModelCtor[];

    const dbLogging = this.configService.get<boolean>("DB_LOGGING");
    const slowQueryMs = Number(this.configService.get<string>("DB_SLOW_QUERY_MS") ?? "500");
    const slowLogger = this.logger;
    const slowQueryLog = (sql: string, timingMs?: number) => {
      if (typeof timingMs === "number" && timingMs >= slowQueryMs) {
        slowLogger.warn(`slow query (${timingMs}ms): ${sql.slice(0, 500)}`);
      }
    };
    const logging = dbLogging ? console.log : slowQueryLog;

    const dialect = this.configService.get("DB_DIALECT");

    let options: SequelizeModuleOptions = {
      logging,
      benchmark: true,
    };

    if (dialect === "postgres") {
      require("pg");

      options = {
        ...options,
        dialect,
        host: this.configService.get("DB_IP"),
        port: +this.configService.get("DB_PORT"),
        username: this.configService.get("DB_USER"),
        password: this.configService.get("DB_PASSWORD"),
        database: this.configService.get("DB_DATABASE"),
        ssl: this.configService.get<boolean>("DB_SSL"),
        logQueryParameters: true,
        dialectOptions: {
          ssl: this.configService.get<boolean>("DB_SSL") === true,
        },
      };
    } else if (!dialect || dialect === "sqlite") {
      options = {
        ...options,
        dialect: dialect ?? "sqlite",
        storage:
          (this.configService.get("DB_STORAGE") ?? env == "test") ? ":memory:" : "database.sqlite",
      };
    }

    // log the options when in development
    if (env !== "production") {
      console.log(this.configService.get<boolean>("DB_LOGGING"));

      this.logger.debug({
        logging: this.configService.get<boolean>("DB_LOGGING"),
        dialect: options.dialect,
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        database: options.database ?? options.storage,
        ssl: options.ssl,
      });
    }

    options.models = models;

    return options;
  }
}
