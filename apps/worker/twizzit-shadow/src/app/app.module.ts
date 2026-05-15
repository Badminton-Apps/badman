import { DatabaseModule } from "@badman/backend-database";
import { LoggingModule } from "@badman/backend-logging";
import { TwizzitShadowModule } from "@badman/backend-twizzit-shadow";
import { FEDERATION_GATEWAY } from "@badman/backend-twizzit-shadow";
import { TwizzitClient } from "@badman/integrations-twizzit-client";
import { configSchema, load } from "@badman/utils";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import versionPackage from "../version.json";
import { TwizzitShadowRunnerService } from "./twizzit-shadow-runner.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: "worker-twizzit-shadow",
    }),
    DatabaseModule,
    TwizzitShadowModule,
  ],
  providers: [
    {
      provide: FEDERATION_GATEWAY,
      useFactory: (config: ConfigService, logger: Logger) =>
        new TwizzitClient({
          credentials: {
            username: config.getOrThrow("TWIZZIT_USERNAME"),
            password: config.getOrThrow("TWIZZIT_PASSWORD"),
          },
          baseUrl: config.get("TWIZZIT_API"),
          organizationId: config.get("TWIZZIT_ORGANIZATION_ID")
            ? Number(config.get("TWIZZIT_ORGANIZATION_ID"))
            : undefined,
          logger: {
            debug: (msg, meta) => logger.debug(msg, meta),
            info: (msg, meta) => logger.log(msg, meta),
            warn: (msg, meta) => logger.warn(msg, meta),
            error: (msg, meta) => logger.error(msg, meta),
          },
        }),
      inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
    },
    TwizzitShadowRunnerService,
  ],
})
export class WorkerTwizzitShadowModule {}
