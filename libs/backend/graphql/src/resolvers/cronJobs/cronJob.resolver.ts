import {
  CronJob,
  CronJobMeta,
  CronJobMetaType,
  CronJobUpdateInput,
  Player,
} from '@badman/backend-database';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import * as cron from 'cron';
import { User } from '@badman/backend-authorization';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { CronService } from '@badman/backend-orchestrator';

@Resolver(() => CronJob)
export class CronJobResolver {
  private readonly logger = new Logger(CronJobResolver.name);

  constructor(private _sequelize: Sequelize, private _cronsService: CronService) {}

  @Query(() => [CronJob])
  async cronJobs(@Args() listArgs: ListArgs): Promise<CronJob[]> {
    return CronJob.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => String)
  async nextRun(@Parent() job: CronJob) {
    // use the cron time to get the next run

    const cronTime = cron.sendAt(job.cronTime);
    return cronTime.toISO();
  }

  @Mutation(() => CronJob)
  async updateCronJob(@User() user: Player, @Args('data') updateCronJobData: CronJobUpdateInput) {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new UnauthorizedException(`You do not have permission to edit this CronJob`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const cronJobDb = await CronJob.findByPk(updateCronJobData.id, { transaction });

      if (!cronJobDb) {
        throw new NotFoundException(`${CronJob.name}: ${updateCronJobData.id}`);
      }

      // Update CronJob
      const result = await cronJobDb.update(updateCronJobData, { transaction });

      // Reinitialize the cron jobs
      this._cronsService.onModuleInit()

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}

@Resolver(() => CronJobMetaType)
export class CronJobMetaResolver {
  @ResolveField(() => String)
  async arguments(@Parent() meta: CronJobMeta): Promise<string> {
    return JSON.stringify(meta.arguments);
  }
}
