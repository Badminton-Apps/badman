import { Availability, Location } from '@badman/api/database';
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

@Resolver(() => Location)
export class LocationsResolver {
  private readonly logger = new Logger(LocationsResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => Location)
  async location(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Location> {
    return await Location.findByPk(id);
  }

  @Query(() => [Location])
  async locations(@Args() listArgs: ListArgs): Promise<Location[]> {
    return Location.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Availability])
  async availibilities(
    @Parent() location: Location,
    @Args() listArgs: ListArgs
  ): Promise<Availability[]> {
    return location.getAvailabilities(ListArgs.toFindOptions(listArgs));
  }
}
