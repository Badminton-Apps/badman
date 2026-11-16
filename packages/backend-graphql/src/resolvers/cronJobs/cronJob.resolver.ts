import {
  CronJob,
  CronJobMeta,
  CronJobMetaType,
  CronJobUpdateInput,
  Player,
} from "@badman/backend-database";
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { ListArgs } from "../../utils";
import * as cron from "cron";
import { User } from "@badman/backend-authorization";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { CronService } from "@badman/backend-orchestrator";

@Resolver(() => CronJob)
export class CronJobResolver {
  private readonly logger = new Logger(CronJobResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private _cronsService: CronService
  ) {}

  @Query(() => [CronJob])
  async cronJobs(@User() user: Player, @Args() listArgs: ListArgs): Promise<CronJob[]> {
    if (!(await user.hasAnyPermission(["change:job"]))) {
      throw new UnauthorizedException(`You do not have permission to view the CronJobs`);
    }

    return CronJob.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => String)
  async nextRun(@Parent() job: CronJob) {
    // use the cron time to get the next run

    const cronTime = cron.sendAt(job.cronTime);
    return cronTime.toISO();
  }

  @Mutation(() => CronJob)
  async runCronJob(
    @User() user: Player,
    @Args("id", { type: () => ID }) id: string
  ): Promise<CronJob> {
    if (!(await user.hasAnyPermission(["change:job"]))) {
      throw new UnauthorizedException(`You do not have permission to run this CronJob`);
    }

    const cronJobDb = await CronJob.findByPk(id);
    if (!cronJobDb) {
      throw new NotFoundException(`${CronJob.name}: ${id}`);
    }

    await this._cronsService.runJob(cronJobDb);
    return cronJobDb;
  }

  @Mutation(() => CronJob)
  async updateCronJob(@User() user: Player, @Args("data") updateCronJobData: CronJobUpdateInput) {
    if (!(await user.hasAnyPermission(["change:job"]))) {
      throw new UnauthorizedException(`You do not have permission to edit this CronJob`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    let result: CronJob;

    try {
      const cronJobDb = await CronJob.findByPk(updateCronJobData.id, { transaction });

      if (!cronJobDb) {
        throw new NotFoundException(`${CronJob.name}: ${updateCronJobData.id}`);
      }

      // Update CronJob
      result = await cronJobDb.update(updateCronJobData, { transaction });

      // Commit transaction
      await transaction.commit();
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }

    // Reinitialize the cron jobs. This re-reads the CronJobs table, so it has to run
    // after the commit — otherwise it re-registers the pre-update schedule. It is
    // deliberately outside the try/catch: the write is already durable, so a failure
    // to re-register must not roll back a committed transaction. It is async and
    // deletes every registered cron before re-adding them, so a rejection must be
    // caught here — an unhandled rejection would take the process down and leave the
    // scheduler empty.
    try {
      await this._cronsService.onModuleInit();
    } catch (error) {
      this.logger.error(
        `Failed to re-register cron jobs after updating ${updateCronJobData.id}`,
        error
      );
    }

    return result;
  }
}

@Resolver(() => CronJobMetaType)
export class CronJobMetaResolver {
  @ResolveField(() => String)
  async arguments(@Parent() meta: CronJobMeta): Promise<string> {
    return JSON.stringify(meta.arguments);
  }
}
