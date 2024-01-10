import { QueueModule } from '@badman/backend-queue';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './crons';
import { OrchestratorRanking } from './orchestrators/ranking.orchestrator';
import { OrchestratorSync } from './orchestrators/sync.orchestrator';
import { RenderService } from './services/render.service';
import { SocketModule } from '@badman/backend-websockets';

@Module({
  providers: [
    // Services
    RenderService,
    CronService, // This is temporary, until we have a better way to handle crons

    // Orchestrators
    OrchestratorSync,
    OrchestratorRanking,
  ],
  imports: [QueueModule, SocketModule, ScheduleModule.forRoot(), ConfigModule],
})
export class OrchestratorModule {}
