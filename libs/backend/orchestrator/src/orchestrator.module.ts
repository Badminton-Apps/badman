import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorSimulation } from './orchestrators/simulation.orchestrator';
import { OrchestratorSync } from './orchestrators/sync.orchestrator';
import { RenderService } from './services/render.service';

@Module({
  providers: [RenderService, OrchestratorSync, OrchestratorSimulation],
  imports: [QueueModule, ConfigModule],
})
export class OrchestratorModule {}
