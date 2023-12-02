import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './crons';
import { OrchestratorSimulation } from './orchestrators/simulation.orchestrator';
import { OrchestratorSync } from './orchestrators/sync.orchestrator';
import { RenderService } from './services/render.service';

@Module({
  providers: [
    // Services
    RenderService,
    CronService, // This is temporary, until we have a better way to handle crons

    // Orchestrators
    OrchestratorSync,
    OrchestratorSimulation,
  ],
  imports: [QueueModule, ScheduleModule.forRoot(), ConfigModule],
})
export class OrchestratorModule {}
