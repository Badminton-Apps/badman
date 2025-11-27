import { CronJob, DatabaseModule, Service } from "@badman/backend-database";
import { CompileModule } from "@badman/backend-compile";
import { LoggingModule } from "@badman/backend-logging";
import { MailingModule } from "@badman/backend-mailing";
import { NotificationsModule } from "@badman/backend-notifications";
import { PupeteerModule } from "@badman/backend-pupeteer";
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
    PupeteerModule,
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
  constructor(
    private readonly gateway: EventsGateway,
    private readonly configService: ConfigService<ConfigType>
  ) {}
  async onApplicationBootstrap() {
    this.logger.log("Starting sync service");

    const devEmailDestination = this.configService.get("DEV_EMAIL_DESTINATION");
    const hangBeforeBrowserCleanup = this.configService.get("HANG_BEFORE_BROWSER_CLEANUP");
    const visualSyncEnabled = this.configService.get("VISUAL_SYNC_ENABLED");
    const enterScoresEnabled = this.configService.get("ENTER_SCORES_ENABLED");
    const vrChangeDates = this.configService.get("VR_CHANGE_DATES");
    const vrAcceptEncounters = this.configService.get("VR_ACCEPT_ENCOUNTERS");

    this.logConfigurationSettings({
      devEmailDestination,
      hangBeforeBrowserCleanup,
      visualSyncEnabled,
      enterScoresEnabled,
      vrChangeDates,
      vrAcceptEncounters,
    });

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

    // Reset all job counters to ensure clean state after worker restart
    // The 'amount' field tracks how many instances of a job are currently running:
    // - When a job starts: amount++ (incremented in processor)
    // - When a job finishes: amount-- (decremented in processor)
    // If the worker crashed or restarted, these counters may be stale (showing jobs
    // as "running" when they're not). Resetting to 0 ensures accurate tracking.
    // The job starts later when the cron scheduler triggers it or when it's manually queued.

    const cronJob = await CronJob.findAll({
      where: {
        "meta.queueName": SyncQueue,
      },
    });

    for (const job of cronJob) {
      this.logger.log(
        `Resetting counter for cron job ${job.meta.jobName}. Job can now be processed by the worker.`
      );
      job.amount = 0; // Reset counter: no jobs are running yet after restart
      job.save();
    }
  }

  private logConfigurationSettings(config: {
    devEmailDestination?: string;
    hangBeforeBrowserCleanup?: boolean;
    visualSyncEnabled?: boolean;
    enterScoresEnabled?: boolean;
    vrChangeDates?: boolean;
    vrAcceptEncounters?: boolean;
  }) {
    this.logger.log("--------------------------------");
    this.logger.log(`Dev email destination: ${config.devEmailDestination}`);
    this.logger.log(`Hang before browser cleanup: ${config.hangBeforeBrowserCleanup}`);
    this.logger.log(`Visual sync enabled: ${config.visualSyncEnabled}`);
    this.logger.log(`Enter scores enabled: ${config.enterScoresEnabled}`);
    this.logger.log(`VR change dates: ${config.vrChangeDates}`);
    this.logger.log(`VR accept encounters: ${config.vrAcceptEncounters}`);
    this.logger.log("--------------------------------");

    this.logSettingWarning(
      config.hangBeforeBrowserCleanup,
      "Hang before browser cleanup is enabled, be sure to clean up the browser instances manually after testing",
      "Hang before browser cleanup is disabled, will clean up the browser instances automatically after testing"
    );

    this.logSettingWarning(
      config.visualSyncEnabled,
      "Visual sync enabled, will show the browser window for debugging during check encounters and enter scores",
      "Visual sync disabled, will run the browser in headless mode"
    );

    this.logSettingWarning(
      config.enterScoresEnabled,
      "Enter scores enabled, will save the scores to toernooi.nl.  be careful with this, as this affects production data",
      "Enter scores disabled, will not save the scores to toernooi.nl.  This is the default behavior, unless node env is set to production"
    );

    this.logSettingWarning(
      !!config.devEmailDestination,
      `Dev email destination configured, will send emails after sync processes to ${config.devEmailDestination}`,
      "No dev email destination configured, will not send any emails after sync processes"
    );

    this.logSettingWarning(
      config.vrChangeDates,
      "VR change dates enabled, will change the dates of the encounters in toernooi.nl after accepting date changes",
      "VR change dates disabled, will not change the dates of the encounters in toernooi.nl after accepting date changes"
    );

    this.logSettingWarning(
      config.vrAcceptEncounters,
      "VR accept encounters enabled, will accept the encounters in toernooi.nl",
      "VR accept encounters disabled, will not accept the encounters"
    );
  }

  private logSettingWarning(condition: boolean, enabledMessage: string, disabledMessage: string) {
    this.logger.warn("--------------------------------");
    this.logger.warn(condition ? enabledMessage : disabledMessage);
    this.logger.warn("--------------------------------");
  }
}
