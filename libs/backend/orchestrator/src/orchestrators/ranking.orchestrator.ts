import { SimulationQueue } from '@badman/backend-queue';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { OrchestratorBase } from './base.orchestrator';
import { RenderService } from '../services/render.service';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '@badman/backend-websockets';

@Processor({
  name: SimulationQueue,
})
export class OrchestratorRanking extends OrchestratorBase {
  override logger = new Logger(OrchestratorRanking.name);

  constructor(
    renderService: RenderService,
    @InjectQueue(SimulationQueue) queue: Queue,
    gateway: EventsGateway,
    configSerivce: ConfigService,
  ) {
    super('ranking', configSerivce, gateway, queue, renderService);
    this.logger.log(`${SimulationQueue} Orchestrator created`);
  }
}
