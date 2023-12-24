import { SyncQueue } from '@badman/backend-queue';
import { EventsGateway } from '@badman/backend-websockets';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { RenderService } from '../services/render.service';
import { OrchestratorBase } from './base.orchestrator';

@Processor({
  name: SyncQueue,
})
export class OrchestratorSync extends OrchestratorBase {
  override logger = new Logger(OrchestratorSync.name);

  constructor(
    renderService: RenderService,
    @InjectQueue(SyncQueue) queue: Queue,
    gateway: EventsGateway,
  ) {
    super('sync', gateway, queue, renderService);
    this.logger.log(`${SyncQueue} Orchestrator created`);
  }
}
