import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorSimulation } from './orchestrators/simulation.orchestrator';
import { OrchestratorSync } from './orchestrators/sync.orchestrator';
import { RenderService } from './services/render.service';
import { CronService } from './crons';

@Module({
  providers: [
    // Services 
    RenderService,
    CronService, // This is temporary, until we have a better way to handle crons

    // Orchestrators
    OrchestratorSync,
    OrchestratorSimulation,
  ],
  imports: [QueueModule, ConfigModule],
})
export class OrchestratorModule {}
