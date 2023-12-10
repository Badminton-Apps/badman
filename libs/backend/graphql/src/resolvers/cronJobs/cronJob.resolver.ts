import {
  CronJob,
  CronJobMeta,
  CronJobMetaType,
} from '@badman/backend-database';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => CronJob)
export class CronJobResolver {
  @Query(() => [CronJob])
  async cronJobs(@Args() listArgs: ListArgs): Promise<CronJob[]> {
    return CronJob.findAll(ListArgs.toFindOptions(listArgs));
  }
}

@Resolver(() => CronJobMetaType)
export class CronJobMetaResolver {
  @ResolveField(() => String)
  async arguments(@Parent() meta: CronJobMeta): Promise<string> {
    return JSON.stringify(meta.arguments);
  }
}
