import { TranslateModule } from '@badman/backend-translate';
import { CronJob, DatabaseModule, Service } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule, SyncQueue } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { VisualModule } from '@badman/backend-visual';
import { SearchModule } from '@badman/backend-search';
import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import versionPackage from '../version.json';
import {
  CheckEncounterProcessor,
  CheckRankingProcessor,
  EnterScoresProcessor,
  GlobalConsumer,
  SyncDateProcessor,
  SyncEventsProcessor,
  SyncRankingProcessor,
} from './processors';
import { EVENTS, configSchema, load } from '@badman/utils';
import { EventsGateway, SocketModule } from '@badman/backend-websockets';

@Module({
  providers: [
    GlobalConsumer,

    SyncDateProcessor,
    SyncRankingProcessor,
    SyncEventsProcessor,
    EnterScoresProcessor,
    CheckEncounterProcessor,
    CheckRankingProcessor,
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
      name: 'worker-sync',
    }),
    DatabaseModule,
    RankingModule,
    QueueModule,
    SearchModule,
    NotificationsModule,
    VisualModule,
    TranslateModule,
    SocketModule,
  ],
})
export class WorkerSyncModule implements OnApplicationBootstrap {
  protected logger = new Logger(WorkerSyncModule.name);
  
  constructor(private readonly gateway: EventsGateway) {}
  async onApplicationBootstrap() {
    
    this.logger.log('Starting sync service');

    const service = await Service.findOne({ where: { name: 'sync' } });
    if (!service) {
      this.logger.error('Could not find sync service');
      return;
    }

    service.status = 'started';
    await service?.save();
    this.gateway.server.emit(EVENTS.SERVICE.SERVICE_STARTED, {
      id: service?.id,
    });

    // Reset all jobs
    const cronJob = await CronJob.findAll({
      where: {
        'meta.queueName': SyncQueue,
      },
    });

    for (const job of cronJob) {
      this.logger.log(`Starting cron job ${job.meta.jobName}`);
      job.amount = 0;
      job.save();
    }
  }
}
