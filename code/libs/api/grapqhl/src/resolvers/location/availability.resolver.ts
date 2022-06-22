import {
  Availability,
  AvailabilityException,
  ExceptionType,
} from '@badman/api/database';
import { Inject, Logger } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Availability)
export class AvailabilitysResolver {
  private readonly logger = new Logger(AvailabilitysResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => Availability)
  async availability(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Availability> {
    return await Availability.findByPk(id);
  }

  @Query(() => [Availability])
  async availabilities(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Availability[] }> {
    return Availability.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  // @ResolveField(() => [AvailiblyDayType])
  // async days(@Parent() availability: Availability): Promise<AvailiblyDay[]> {
  //   return availability.days;
  // }

  @ResolveField(() => [ExceptionType])
  async exceptions(
    @Parent() availability: Availability
  ): Promise<AvailabilityException[]> {
    return availability.exceptions?.map((e) => {
      return {
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      };
    });
  }
}
