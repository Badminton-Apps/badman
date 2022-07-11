import {
  Comment,
  EventCompetition,
  Player,
  SubEventCompetition,
} from '@badman/api/database';
import {
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { logger } from 'elastic-apm-node';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../../decorators';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEventCompetition {
  @Field()
  count: number;

  @Field(() => [EventCompetition])
  rows: EventCompetition[];
}
@Resolver(() => EventCompetition)
export class EventCompetitionResolver {
  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => EventCompetition)
  async eventCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventCompetition> {
    let eventCompetition = await EventCompetition.findByPk(id);

    if (!eventCompetition) {
      eventCompetition = await EventCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!eventCompetition) {
      throw new NotFoundException(id);
    }
    return eventCompetition;
  }

  @Query(() => PagedEventCompetition)
  async eventCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EventCompetition[] }> {
    return EventCompetition.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() event: EventCompetition,
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return event.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Comment])
  async comments(
    @Parent() event: EventCompetition,
    @Args() listArgs: ListArgs
  ): Promise<Comment[]> {
    return event.getComments(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => EventCompetition)
  async copyEventCompetition(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('number') year: number
  ) {
    if (!user.hasAnyPermission([`add:competition`])) {
      throw new UnauthorizedException(
        `You do not have permission to add a competition`
      );
    }
    const transaction = await this._sequelize.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.findByPk(id, {
        transaction,
        include: [{ model: SubEventCompetition }],
      });
      const newName = `${eventCompetitionDb.name
        .replace(/(\d{4}-\d{4})/gi, '')
        .trim()} ${year}-${year + 1}`;

      const newEventCompetitionDb = new EventCompetition({
        ...eventCompetitionDb.toJSON(),
        id: undefined,
        visualCode: undefined,
        startYear: year,
        name: newName,
      });

      const newEventCompetitionDbSaved = await newEventCompetitionDb.save({
        transaction,
      });
      const newSubEvents = [];
      for (const subEventCompetition of eventCompetitionDb.subEventCompetitions) {
        const newSubEventCompetitionDb = new SubEventCompetition({
          ...subEventCompetition.toJSON(),
          id: undefined,
          visualCode: undefined,
          eventId: newEventCompetitionDbSaved.id,
        });
        await newSubEventCompetitionDb.save({ transaction });
        newSubEvents.push(newSubEventCompetitionDb);
      }

      newEventCompetitionDbSaved.subEventCompetitions = newSubEvents;

      await transaction.commit();
      return newEventCompetitionDb;
    } catch (e) {
      logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  // @Mutation(returns => EventCompetition)
  // async addEventCompetition(
  //   @Args('newEventCompetitionData') newEventCompetitionData: NewEventCompetitionInput,
  // ): Promise<EventCompetition> {
  //   const recipe = await this.recipesService.create(newEventCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeEventCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
