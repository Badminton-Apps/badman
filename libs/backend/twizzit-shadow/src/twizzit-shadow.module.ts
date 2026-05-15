import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { RecordSkipTracker } from "./record-skip-tracker";
import { RunModeService } from "./run-mode.service";
import { ShadowUpsertService } from "./shadow-upsert.service";
import { SyncCheckpointService } from "./sync-checkpoint.service";
import { SyncRunService } from "./sync-run.service";
import { TruncateShadowTablesService } from "./truncate-shadow-tables.service";
import { TwizzitShadowIngestService } from "./twizzit-shadow-ingest.service";

@Module({
  imports: [DatabaseModule],
  providers: [
    ShadowUpsertService,
    RecordSkipTracker,
    SyncRunService,
    SyncCheckpointService,
    RunModeService,
    TruncateShadowTablesService,
    TwizzitShadowIngestService,
  ],
  exports: [TwizzitShadowIngestService],
})
export class TwizzitShadowModule {}
