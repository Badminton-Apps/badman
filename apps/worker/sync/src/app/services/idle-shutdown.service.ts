import { SyncQueue } from "@badman/backend-queue";
import { restartBrowser } from "@badman/backend-pupeteer";
import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigType } from "@badman/utils";
import { Queue } from "bull";

@Injectable()
export class IdleShutdownService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdleShutdownService.name);
  private readonly idleTimeoutMs: number;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @InjectQueue(SyncQueue) private readonly queue: Queue,
    private readonly configService: ConfigService<ConfigType>
  ) {
    this.idleTimeoutMs =
      this.configService.get<number>("WORKER_IDLE_TIMEOUT_MS") ?? 30 * 60 * 1000; // 30 min default
  }

  onModuleInit() {
    this.logger.log(`Idle shutdown enabled: ${this.idleTimeoutMs / 60000} min timeout`);

    // Listen for queue events that indicate activity
    this.queue.on("active", () => this.resetIdleTimer());
    this.queue.on("waiting", () => this.resetIdleTimer());

    // Start the initial idle timer
    this.resetIdleTimer();
  }

  onModuleDestroy() {
    this.clearIdleTimer();
  }

  private resetIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.onIdle(), this.idleTimeoutMs);
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private async onIdle() {
    // Double-check: are there any active or waiting jobs?
    const [activeCount, waitingCount] = await Promise.all([
      this.queue.getActiveCount(),
      this.queue.getWaitingCount(),
    ]);

    if (activeCount > 0 || waitingCount > 0) {
      this.logger.log(
        `Idle timer fired but queue has ${activeCount} active / ${waitingCount} waiting jobs — resetting timer`
      );
      this.resetIdleTimer();
      return;
    }

    this.logger.log(
      `⏸️  Service idle for ${this.idleTimeoutMs / 60000} min — no new jobs. Will remain running; Render may suspend.`
    );

    // Clean up browser to free resources while idle
    try {
      await restartBrowser();
      this.logger.log("✅ Browser closed to free resources");
    } catch (error) {
      this.logger.warn("Error closing browser during idle:", (error as Error)?.message);
    }

    // Reset timer for next check
    this.resetIdleTimer();
  }
}
