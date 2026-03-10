import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { Badminton, RankingQueue, SyncQueue } from "./queues";
import { ConfigType } from "@badman/utils";
import { TransactionManager } from "./services";

const BullQueueModules = [
  BullModule.registerQueue({ name: RankingQueue }),
  BullModule.registerQueue({ name: SyncQueue }),

  // Belgium
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Points }),
  BullModule.registerQueue({ name: Badminton.Belgium.Flanders.Places }),
];

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<ConfigType>) => {
        const lockDuration =
          configService.get<number>("QUEUE_LOCK_DURATION_MS") ?? 5 * 60 * 1000; // 5 minutes default
        const lockRenewTime =
          configService.get<number>("QUEUE_LOCK_RENEW_TIME_MS") ??
          Math.floor(lockDuration / 2); // half of lock duration
        const maxStalledCount =
          configService.get<number>("QUEUE_MAX_STALLED_COUNT") ?? 3;
        const jobTimeout =
          configService.get<number>("QUEUE_JOB_TIMEOUT_MS") ?? 30 * 60 * 1000; // 30 min default: cap job runtime so stuck jobs don't block the queue

        return {
          redis: {
            host: configService.get("REDIS_HOST"),
            port: configService.get<number>("REDIS_PORT") ?? 6379,
            password: configService.get("REDIS_PASSWORD"),
            db: configService.get<number>("QUEUE_DB") ?? 0,
          },
          settings: {
            lockDuration,
            lockRenewTime,
            maxStalledCount,
          },
          defaultJobOptions: {
            timeout: jobTimeout,
          },
        };
      },
      inject: [ConfigService],
    }),
    ...BullQueueModules,
  ],
  providers: [TransactionManager],
  exports: [TransactionManager, ...BullQueueModules],
})
export class QueueModule {}
