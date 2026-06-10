import { join } from "path";
import { DatabaseModule } from "@badman/backend-database";
import { LoggingModule } from "@badman/backend-logging";
import { QueueModule } from "@badman/backend-queue";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import versionPackage from "../version.json";
import { PlacesProcessor } from "./places.processor";
import { BelgiumFlandersPlacesModule } from "@badman/belgium-flanders-places";
import { configSchema, load } from "@badman/utils";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      // Resolve .env at the workspace root via an absolute path: this file
      // compiles to <app>/dist/app/, and `turbo run dev` runs apps with the
      // package dir (not the workspace root) as cwd, so the default
      // cwd-relative lookup misses the root .env.
      envFilePath: join(__dirname, "..", "..", "..", "..", "..", "..", "..", ".env"),
      validationSchema: configSchema,
      load: [load],
    }),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: "worker-belgium-flanders-places",
    }),
    QueueModule,
    DatabaseModule,
    BelgiumFlandersPlacesModule,
  ],
  providers: [PlacesProcessor],
})
export class AppModule {}
