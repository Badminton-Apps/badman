import { CronJob, DatabaseModule, Service } from "@badman/backend-database";
import { CompileModule } from "@badman/backend-compile";
import { LoggingModule } from "@badman/backend-logging";
import { MailingModule } from "@badman/backend-mailing";
import { NotificationsModule } from "@badman/backend-notifications";
import { QueueModule, SyncQueue } from "@badman/backend-queue";
import { RankingModule } from "@badman/backend-ranking";
import { SearchModule } from "@badman/backend-search";
import { TranslateModule } from "@badman/backend-translate";
import { TwizzitModule } from "@badman/backend-twizzit";
import { VisualModule } from "@badman/backend-visual";
import { EventsGateway, SocketModule } from "@badman/backend-websockets";
import { EVENTS, configSchema, load, ConfigType } from "@badman/utils";
import { Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";
import versionPackage from "../version.json";
import {
  CheckEncounterProcessor,
  CheckRankingProcessor,
  EnterScoresProcessor,
  EventTournamenScheduler,
  SubEventTournamentScheduler,
  DrawTournamentScheduler,
  MatchTournamentScheduler,
  DrawStandingTournamentProcessor,
  EventTournamentProcessor,
  GlobalConsumer,
  SyncDateProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
  SyncTwizzitProcessor,
  SubEventTournamentProcessor,
  DrawTournamentProcessor,
  GameTournamentProcessor,
  ScheduleRecalculateStandingCompetitionDraw,
  ScheduleRecalculateStandingCompetitionEvent,
  ScheduleRecalculateStandingCompetitionSubEvent,
  DrawStandingCompetitionProcessor,
} from "./processors";

@Module({
  providers: [
    GlobalConsumer,

    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    SyncTwizzitProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,
    CheckRankingProcessor,

    // v2
    EventTournamentProcessor,
    SubEventTournamentProcessor,
    DrawTournamentProcessor,
    GameTournamentProcessor,
    DrawStandingTournamentProcessor,

    DrawStandingCompetitionProcessor,

    EventTournamenScheduler,
    SubEventTournamentScheduler,
    DrawTournamentScheduler,
    MatchTournamentScheduler,

    // Standing
    ScheduleRecalculateStandingCompetitionDraw,
    ScheduleRecalculateStandingCompetitionSubEvent,
    ScheduleRecalculateStandingCompetitionEvent,
  ],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    // Lib modules
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: "worker-sync",
    }),
    CompileModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ConfigType>) => ({
        view: {
          root: join(__dirname, "compile", "libs", "mailing"),
          engine: "pug",
        },
        debug: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    MailingModule,
    RankingModule,
    QueueModule,
    SearchModule,
    NotificationsModule,
    VisualModule,
    TwizzitModule,
    TranslateModule,
    SocketModule,
  ],
})
export class WorkerSyncModule implements OnApplicationBootstrap {
  protected logger = new Logger(WorkerSyncModule.name);

  constructor(private readonly gateway: EventsGateway) {}
  async onApplicationBootstrap() {
    this.logger.log("Starting sync service");

    const service = await Service.findOne({ where: { name: "sync" } });
    if (!service) {
      this.logger.error("Could not find sync service");
      return;
    }

    service.status = "started";
    await service?.save();
    this.gateway.server.emit(EVENTS.SERVICE.SERVICE_STARTED, {
      id: service?.id,
    });

    // Reset all jobs
    const cronJob = await CronJob.findAll({
      where: {
        "meta.queueName": SyncQueue,
      },
    });

    for (const job of cronJob) {
      this.logger.log(`Starting cron job ${job.meta.jobName}`);
      job.amount = 0;
      job.save();
    }
  }
}
