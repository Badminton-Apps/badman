import { CacheModule } from "@badman/backend-cache";
import { ConfigType } from "@badman/utils";
import { Logger, Module, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { slugifyModel } from "sequelize-slugify";
import { Model, Sequelize } from "sequelize-typescript";
import { Club, EventCompetition, EventTournament, Player, Team } from "./models";
import { SequelizeConfigProvider } from "./provider";
import { loadTest } from "./_testing/load-test";

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useClass: SequelizeConfigProvider,
      inject: [ConfigService],
    }),
    ConfigModule,
    CacheModule,
  ],
})
export class DatabaseModule implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseModule.name);

  // get sequelize instance
  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly sequelize: Sequelize
  ) {}

  async onModuleInit() {
    this.sequelize.options.logging = false;

    this.logger.debug("initialize addons");
    slugifyModel(Player as unknown as Model, {
      source: ["firstName", "lastName", "memberId"],
    });
    slugifyModel(EventCompetition as unknown as Model, {
      source: ["name"],
    });
    slugifyModel(EventTournament as unknown as Model, {
      source: ["name"],
    });
    slugifyModel(Club as unknown as Model, {
      source: ["name"],
    });
    slugifyModel(Team as unknown as Model, {
      source: ["name", "season"],
    });
  }

  async onApplicationBootstrap() {
    // Deferred to bootstrap so EnrollmentModule.onModuleInit has registered
    // IndexCalculationService on EventEntry before test fixtures fire hooks.
    if (this.configService.get("NODE_ENV") === "test") {
      this.logger.log("Initializing test database");
      await this.sequelize.sync({ force: true });

      this.logger.log("Loading test data");
      await loadTest();
    }
  }
}
