import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { SentryModule } from "@sentry/nestjs/setup";
import { PrematureCloseFilter } from "./filters/premature-close.filter";
import { AppController, ImageController } from "./controllers";
import { CpController } from "./controllers/cp.controller";
import { ExportController } from "./controllers/export.controller";
import { AvgLevelService } from "./services/export/avg-level.service";
import { EnrollmentService } from "./services/export/enrollment.service";
import { ExceptionsService } from "./services/export/exceptions.service";
import { LocationsService } from "./services/export/locations.service";
import { TeamsService } from "./services/export/teams.service";

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
import { existsSync } from "fs";
import { join } from "path";
import versionPackage from "../version.json";
import { CleanEnvironmentModule } from "./clean-environment.module";
import { CalendarController } from "./controllers/ical.controller";

const productionModules = [];
// The Angular frontend lives in a separate repository (Constitution v2.0.0,
// Principle V). This API only serves a frontend bundle if the deploy pipeline
// has placed one at apps/api/dist/client; when absent (the normal case) static
// serving is skipped instead of booting ServeStaticModule on a missing dir.
// This file compiles to apps/api/dist/app/, so one level up is dist/.
const staticFrontendRoot = join(__dirname, "..", "client");
if (
  (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") &&
  existsSync(staticFrontendRoot)
) {
  Logger.debug(`Serving static frontend bundle from: ${staticFrontendRoot}`);
  productionModules.push(
    ServeStaticModule.forRoot({
      rootPath: staticFrontendRoot,
      exclude: ["api/*", "/graphql"],
    })
  );
}

// Resolve .env relative to the workspace root, not process.cwd().
// This file compiles to apps/api/dist/app/app.module.js, so the workspace root
// is four levels up (app → dist → api → apps → root). Using an absolute path
// avoids failures when a runner sets a different working directory.
const projectRoot = join(__dirname, "..", "..", "..", "..");
const envFileName = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const envFilePath = join(projectRoot, envFileName);

@Module({
  imports: [
    SentryModule.forRoot(),
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
  controllers: [AppController, ImageController, CalendarController, CpController, ExportController],
  providers: [
    Logger,
    TeamsService,
    ExceptionsService,
    LocationsService,
    EnrollmentService,
    AvgLevelService,
    { provide: APP_FILTER, useClass: PrematureCloseFilter },
  ],
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
