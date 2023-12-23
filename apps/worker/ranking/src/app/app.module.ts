import { DatabaseModule, Service } from '@badman/backend-database';
import { LoggingModule } from '@badman/backend-logging';
import { QueueModule } from '@badman/backend-queue';
import { RankingModule } from '@badman/backend-ranking';
import { EventsGateway, SocketModule } from '@badman/backend-websockets';
import { EVENTS, configSchema, load } from '@badman/utils';
import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import versionPackage from '../version.json';
import { RankingProcessor, SimulationProcessor } from './processors';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validationSchema: configSchema,
      load: [load],
    }),
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'worker-ranking',
    }),
    QueueModule,
    DatabaseModule,
    RankingModule,
    SocketModule,
  ],
  providers: [SimulationProcessor, RankingProcessor],
})
export class WorkerRankingModule implements OnApplicationBootstrap {
  protected logger = new Logger(WorkerRankingModule.name);

  constructor(private readonly gateway: EventsGateway) {}
  async onApplicationBootstrap() {
    const service = await Service.findOne({ where: { name: 'ranking' } });
    if (!service) {
      this.logger.error('Could not find sync service');
      return;
    }

    service.status = 'started';
    await service?.save();

    this.gateway.server.emit(EVENTS.SERVICE.SERVICE_STARTED, {
      id: service?.id,
    });
  }
}
