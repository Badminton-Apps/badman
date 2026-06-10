import { join } from "path";
import { DatabaseModule } from "@badman/backend-database";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { PupeteerModule } from "@badman/backend-pupeteer";
import { VisualModule } from "@badman/backend-visual";
import { configSchema, load } from "@badman/utils";
import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RecalculateEntryIndexService, TwizzitToPlayerDbService } from "./scripts";

@Module({
  providers: [TwizzitToPlayerDbService, RecalculateEntryIndexService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      // Resolve .env at the workspace root via an absolute path: this file
      // compiles to <app>/dist/app/, and `turbo run dev` runs apps with the
      // package dir (not the workspace root) as cwd, so the default
      // cwd-relative lookup misses the root .env.
      envFilePath: join(__dirname, "..", "..", "..", "..", ".env"),
      validationSchema: configSchema,
      load: [load],
    }),
    DatabaseModule,
    EnrollmentModule,
    PupeteerModule,
    VisualModule,
  ],
})
export class ScriptModule implements OnModuleInit {
  private readonly logger = new Logger(ScriptModule.name);

  constructor(
    private fixer: TwizzitToPlayerDbService,
    private recalculateEntryIndex: RecalculateEntryIndexService
  ) {}

  async onModuleInit() {
    this.logger.log("Running script");

    // Check if TEAM_ID is provided to run entry recalculation
    const teamId = process.env["TEAM_ID"];
    if (teamId) {
      await this.recalculateEntryIndex.recalculateForTeam(teamId);
    } else {
      await this.fixer.process();
    }

    this.logger.log("Script finished");
  }
}
