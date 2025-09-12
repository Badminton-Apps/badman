import { DatabaseModule } from "@badman/backend-database";
import { PupeteerModule } from "@badman/backend-pupeteer";
import { VisualModule } from "@badman/backend-visual";
import { configSchema, load } from "@badman/utils";
import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TwizzitToPlayerDbService } from "./scripts";

@Module({
  providers: [TwizzitToPlayerDbService],
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

  constructor(private fixer: TwizzitToPlayerDbService) {}

  async onModuleInit() {
    this.logger.log("Running script");

    await this.fixer.process();

    this.logger.log("Script finished");
  }
}
