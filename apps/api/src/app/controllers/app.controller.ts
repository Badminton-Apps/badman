import { User } from "@badman/backend-authorization";

import { Player } from "@badman/backend-database";
import { PlannerService } from "@badman/backend-generator";
import { getSyncJobOptions, RankingQueue, SyncQueue } from "@badman/backend-queue";
import { ConfigType } from "@badman/utils";
import { InjectQueue } from "@nestjs/bull";
import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bull";
import { FastifyReply } from "fastify";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectQueue(RankingQueue) private _rankingQueue: Queue,
    @InjectQueue(SyncQueue) private _syncQueue: Queue,
    private planner: PlannerService,
    private configService: ConfigService<ConfigType>
  ) {}

  @Post("queue-job")
  async getQueueJob(
    @User() user: Player,
    @Body()
    args: {
      job: string;
      queue: typeof SyncQueue | typeof RankingQueue;
      jobArgs: { [key: string]: unknown };
      removeOnComplete: boolean;
      removeOnFail: boolean;
    }
  ) {
    let effectiveUser: Player | null = user?.id ? user : null;

    // DEV ONLY: bypass auth for queue-job when NODE_ENV=development and explicit env vars are set.
    // Never runs in production (NODE_ENV check). See DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH.
    if (!effectiveUser) {
      const nodeEnv = this.configService.get("NODE_ENV");
      const allowNoAuth =
        this.configService.get("DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH") === true ||
        this.configService.get("DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH") === "true";
      const asPlayerId = this.configService.get("DEV_ONLY_QUEUE_JOB_AS_PLAYER_ID");
      const isDevelopment = nodeEnv === "development";

      if (allowNoAuth && nodeEnv !== "development") {
        this.logger.warn(
          "DEV_ONLY_ALLOW_QUEUE_JOB_WITHOUT_AUTH is set but NODE_ENV is not development — bypass is DISABLED (security)."
        );
      }

      if (isDevelopment && allowNoAuth && asPlayerId) {
        const devUser = await Player.findByPk(asPlayerId);
        if (devUser) {
          const hasPermission = await devUser.hasAnyPermission(["change:job"]);
          if (hasPermission) {
            this.logger.warn(
              `[DEV ONLY] Unauthenticated queue-job: impersonating player ${asPlayerId}. Never enable in production.`
            );
            effectiveUser = devUser;
          }
        }
      }
    }

    if (!effectiveUser?.id) {
      this.logger.error(
        `User authentication failed: user.id is undefined. User object: ${JSON.stringify({
          sub: user?.sub,
          hasId: !!user?.id,
          keys: Object.keys(user || {}),
        })}`
      );
      throw new UnauthorizedException(
        "User not found in database. Please ensure your account exists in the system."
      );
    }

    const userForJob = effectiveUser;

    this.logger.debug(
      `User (id: ${userForJob.id}) is trying to add a job to the queue with args: ${JSON.stringify(args)}`
    );

    const hasPermission = await userForJob.hasAnyPermission(["change:job"]);
    if (!hasPermission) {
      this.logger.debug(
        `User (id: ${userForJob.id} / ${userForJob?.fullName || "unknown"}) does not have permission to add a job to the queue`
      );
      throw new UnauthorizedException("You do not have permission to do this");
    }

    this.logger.debug(
      `Adding job ${args.job} to queue ${args.queue} for user ${userForJob?.fullName || "unknown"}, permissions: ${hasPermission}`
    );

    if (!args.jobArgs) {
      args.jobArgs = {};
    }

    // append the user id to the job args
    args.jobArgs["userId"] = userForJob.id;

    switch (args.queue) {
      case SyncQueue:
        return this._syncQueue.add(
          args.job,
          args.jobArgs,
          getSyncJobOptions({
            removeOnComplete: args.removeOnComplete ?? true,
            removeOnFail: args.removeOnFail ?? 50,
          })
        );
      case RankingQueue:
        return this._rankingQueue.add(args.job, args.jobArgs, {
          removeOnComplete: args.removeOnComplete ?? true,
          removeOnFail: args.removeOnFail ?? 50,
        });
      default:
        throw new HttpException("Unknown queue", 500);
    }
  }

  @Get("planner")
  async getPlanner(@Res() res: FastifyReply, @Query() query: { season: string }) {
    this.logger.debug("Generating planner");
    const result = await this.planner.getPlannerData(query.season);

    this.logger.debug(`Got ${Object.keys(result).length} clubs`);

    // Respond ok for now
    res.status(200).send(result);
  }
}
