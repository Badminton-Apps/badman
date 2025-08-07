import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { CronJobMetaResolver, CronJobResolver } from "./cronJob.resolver";
import { OrchestratorModule } from "@badman/backend-orchestrator";

@Module({
  imports: [DatabaseModule, OrchestratorModule],
  providers: [CronJobResolver, CronJobMetaResolver],
})
export class CronJobResolverModule {}
