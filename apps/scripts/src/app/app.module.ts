import { DatabaseModule } from "@badman/backend-database";
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
      validationSchema: configSchema,
      load: [load],
    }),
    DatabaseModule,
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
