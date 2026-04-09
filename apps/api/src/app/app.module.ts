import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController, ImageController } from "./controllers";
import { CpController } from "./controllers/cp.controller";

import { AuthorizationModule } from "@badman/backend-authorization";
import { DatabaseModule } from "@badman/backend-database";
import { GeneratorModule } from "@badman/backend-generator";
import { GrapqhlModule } from "@badman/backend-graphql";
import { HealthModule } from "@badman/backend-health";
import { LoggingModule } from "@badman/backend-logging";
import { MailingModule } from "@badman/backend-mailing";
import { NotificationsModule } from "@badman/backend-notifications";
import { OrchestratorModule } from "@badman/backend-orchestrator";
import { PupeteerModule } from "@badman/backend-pupeteer";
import { QueueModule } from "@badman/backend-queue";
import { SearchModule } from "@badman/backend-search";
import { TransferLoanModule } from "@badman/backend-transfer-loan";
import { TranslateModule } from "@badman/backend-translate";
import { TwizzitModule } from "@badman/backend-twizzit";
import { SocketModule } from "@badman/backend-websockets";
import { ConfigType, configSchema, load } from "@badman/utils";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import versionPackage from "../version.json";
import { CleanEnvironmentModule } from "./clean-environment.module";
import { CalendarController } from "./controllers/ical.controller";

const productionModules = [];
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
  Logger.debug(`Adding static file serving to folder: ${join(__dirname, "..", "badman")}`);
  productionModules.push(
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "badman", "browser"),
      exclude: ["api/*", "/graphql"],
    })
  );
}

// Resolve .env relative to the project root, not process.cwd().
// The webpack bundle outputs to dist/apps/api/, so __dirname is three levels
// below the workspace root. Using an absolute path avoids failures when the
// NX executor (or a deployment runner) sets a different working directory.
const projectRoot = join(__dirname, "..", "..", "..");
const envFileName = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const envFilePath = join(projectRoot, envFileName);

@Module({
  imports: [
    ...productionModules,
    CleanEnvironmentModule.forPredicate(envFilePath, () => process.env.NODE_ENV === "test"),
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
      expandVariables: true,
      envFilePath: envFilePath,
      validatePredefined: process.env.NODE_ENV !== "test",
    }),
    AuthorizationModule,
    GrapqhlModule,
    DatabaseModule,

    // Lib modules
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: "api",
    }),
    TwizzitModule,
    MailingModule,
    NotificationsModule,
    GeneratorModule,
    PupeteerModule,
    SearchModule,
    QueueModule,
    HealthModule,
    TranslateModule,
    OrchestratorModule,
    SocketModule,
    TransferLoanModule,
  ],
  controllers: [AppController, ImageController, CalendarController, CpController],
  providers: [Logger],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(configService: ConfigService<ConfigType>) {
    this.logger.log(`${AppModule.name} loaded, env: ${configService.get("NODE_ENV")}`);

    const allowNoAuth = configService.get("DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH");
    const asPlayerId = configService.get("DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID");
    if (allowNoAuth || asPlayerId) {
      this.logger.warn("----------------------------------------");
      this.logger.warn("DEV ONLY - NEVER USE IN PRODUCTION:");
      this.logger.warn(
        "  DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH / DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID are set."
      );
      this.logger.warn(
        "  Unauthenticated queue-job requests will be accepted when NODE_ENV=development."
      );
      this.logger.warn("  Bypass is DISABLED when NODE_ENV is not development.");
      this.logger.warn("----------------------------------------");
    }
  }
}
