import { SyncQueue } from '@badman/backend-queue';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { OrchestratorBase } from './base.orchestrator';
import { RenderService } from '../services/render.service';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '@badman/backend-websocket';

@Processor({
  name: SyncQueue,
})
export class OrchestratorSync extends OrchestratorBase {
  override logger = new Logger(OrchestratorSync.name);

  constructor(
    renderService: RenderService,
    @InjectQueue(SyncQueue) queue: Queue,
    gateway: EventsGateway,
    configSerivce: ConfigService,
  ) {
    super('sync', configSerivce, gateway, queue, renderService);
    this.logger.log(`${SyncQueue} Orchestrator created`);
  }
}
