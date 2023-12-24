import { RankingQueue } from '@badman/backend-queue';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { OrchestratorBase } from './base.orchestrator';
import { RenderService } from '../services/render.service';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '@badman/backend-websockets';
import { ConfigType } from '@badman/utils';

@Processor({
  name: RankingQueue,
})
export class OrchestratorRanking extends OrchestratorBase {
  override logger = new Logger(OrchestratorRanking.name);

  constructor(
    renderService: RenderService,
    @InjectQueue(RankingQueue) queue: Queue,
    gateway: EventsGateway,
    configSerivce: ConfigService<ConfigType>,
  ) {
    super('ranking', configSerivce, gateway, queue, renderService);
    this.logger.log(`${RankingQueue} Orchestrator created`);
  }
}
