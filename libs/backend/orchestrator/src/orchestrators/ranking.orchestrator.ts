import { RankingQueue } from '@badman/backend-queue';
import { EventsGateway } from '@badman/backend-websockets';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { RenderService } from '../services/render.service';
import { OrchestratorBase } from './base.orchestrator';

@Processor({
  name: RankingQueue,
})
export class OrchestratorRanking extends OrchestratorBase {
  override logger = new Logger(OrchestratorRanking.name);

  constructor(
    renderService: RenderService,
    @InjectQueue(RankingQueue) queue: Queue,
    gateway: EventsGateway,
  ) {
    super('ranking', gateway, queue, renderService);
    this.logger.log(`${RankingQueue} Orchestrator created`);
  }
}
