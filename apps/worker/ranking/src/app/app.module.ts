import { join } from "path";
import { CronJob, DatabaseModule, Service } from "@badman/backend-database";
import { LoggingModule } from "@badman/backend-logging";
import { QueueModule, RankingQueue } from "@badman/backend-queue";
import { RankingModule } from "@badman/backend-ranking";
import { EventsGateway, SocketModule } from "@badman/backend-websockets";
import { EVENTS, configSchema, load } from "@badman/utils";
import { BelgiumFlandersPlacesModule } from "@badman/belgium-flanders-places";
import { BelgiumFlandersPointsModule } from "@badman/belgium-flanders-points";
import { Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import versionPackage from "../version.json";
import { PlacesProcessor, PointProcessor, RankingProcessor } from "./processors";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      // Resolve .env at the workspace root via an absolute path: this file
      // compiles to <app>/dist/app/, and `turbo run dev` runs apps with the
      // package dir (not the workspace root) as cwd, so the default
      // cwd-relative lookup misses the root .env.
      envFilePath: join(__dirname, "..", "..", "..", "..", "..", ".env"),
      validationSchema: configSchema,
      load: [load],
    }),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: "worker-ranking",
    }),
    QueueModule,
    DatabaseModule,
    RankingModule,
    SocketModule,
    // The Flanders points/places simulation queues are fed by RankingModule's
    // services, which block on job.finished(). Their processors used to live
    // in standalone worker apps that were never deployed (BAD-261), so prod
    // enqueues hung forever. Consume them here, in the same worker.
    BelgiumFlandersPlacesModule,
    BelgiumFlandersPointsModule,
  ],
  providers: [RankingProcessor, PlacesProcessor, PointProcessor],
})
export class WorkerRankingModule implements OnApplicationBootstrap {
  protected logger = new Logger(WorkerRankingModule.name);

  constructor(private readonly gateway: EventsGateway) {}
  async onApplicationBootstrap() {
    const service = await Service.findOne({ where: { name: "ranking" } });
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
        "meta.queueName": RankingQueue,
      },
    });

    for (const job of cronJob) {
      this.logger.log(`Starting cron job ${job.meta.jobName}`);
      job.amount = 0;
      job.save();
    }
  }
}
