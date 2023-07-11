import {
  EncounterChange,
  EncounterChangeDate,
  Location,
} from '@badman/backend-database';
import { Logger, NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterChange {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterChange])
  rows?: EncounterChange[];
}

@Resolver(() => EncounterChange)
export class EncounterChangeCompetitionResolver {
  private readonly logger = new Logger(EncounterChangeCompetitionResolver.name);

  @Query(() => EncounterChange)
  async encounterChange(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterChange> {
    const encounterCompetition = await EncounterChange.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterChange)
  async encounterChanges(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterChange[] }> {
    return EncounterChange.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [EncounterChangeDate])
  async dates(
    @Parent() encounterChange: EncounterChange
  ): Promise<EncounterChangeDate[]> {
    return encounterChange.getDates();
  }
}

@Resolver(() => EncounterChangeDate)
export class EncounterChangeDateCompetitionResolver {
  private readonly logger = new Logger(
    EncounterChangeDateCompetitionResolver.name
  );

  @ResolveField(() => Location)
  async dates(
    @Parent() encounterChangeDate: EncounterChangeDate
  ): Promise<Location> {
    return encounterChangeDate.getLocation();
  }
}
