import { Service } from '@badman/backend-database';
import { Logger } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => Service)
export class ServiceResolver {
  private readonly logger = new Logger(ServiceResolver.name);

  @Query(() => [Service])
  async services(@Args() listArgs: ListArgs): Promise<Service[]> {
    return Service.findAll(ListArgs.toFindOptions(listArgs));
  }
}
