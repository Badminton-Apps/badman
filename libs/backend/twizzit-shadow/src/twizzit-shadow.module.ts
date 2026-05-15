import { DatabaseModule } from "@badman/backend-database";
import { DynamicModule, FactoryProvider, Module } from "@nestjs/common";
import { ModuleMetadata } from "@nestjs/common/interfaces";
import { RecordSkipTracker } from "./record-skip-tracker";
import { RunModeService } from "./run-mode.service";
import { ShadowUpsertService } from "./shadow-upsert.service";
import { SyncCheckpointService } from "./sync-checkpoint.service";
import { SyncRunService } from "./sync-run.service";
import { FEDERATION_GATEWAY } from "./tokens";
import { TruncateShadowTablesService } from "./truncate-shadow-tables.service";
import { TwizzitShadowIngestService } from "./twizzit-shadow-ingest.service";

export interface TwizzitShadowModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  useFactory: FactoryProvider["useFactory"];
  inject?: FactoryProvider["inject"];
}

@Module({})
export class TwizzitShadowModule {
  static forRootAsync(options: TwizzitShadowModuleAsyncOptions): DynamicModule {
    return {
      module: TwizzitShadowModule,
      imports: [DatabaseModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: FEDERATION_GATEWAY,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ShadowUpsertService,
        RecordSkipTracker,
        SyncRunService,
        SyncCheckpointService,
        RunModeService,
        TruncateShadowTablesService,
        TwizzitShadowIngestService,
      ],
      exports: [
        TwizzitShadowIngestService,
        TruncateShadowTablesService,
        SyncRunService,
        FEDERATION_GATEWAY,
      ],
    };
  }
}
