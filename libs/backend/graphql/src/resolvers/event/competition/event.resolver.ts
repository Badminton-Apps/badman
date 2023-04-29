import { User } from '@badman/backend-authorization';
import {
  Comment,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventCompetitionUpdateInput,
  Game,
  Player,
  RankingGroup,
  RankingPoint,
  RankingSystem,
  SubEventCompetition,
} from '@badman/backend-database';
import { PointsService, StartVisualRankingDate } from '@badman/backend-ranking';
import { IsUUID } from '@badman/utils';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
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
  private readonly logger = new Logger(EventCompetitionResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private _pointService: PointsService
  ) {}

  @Query(() => EventCompetition)
  async eventCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventCompetition> {
    const eventCompetition = IsUUID(id)
      ? await EventCompetition.findByPk(id)
      : await EventCompetition.findOne({
          where: {
            slug: id,
          },
        });

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
  async updateEventCompetition(
    @User() user: Player,
    @Args('data') updateEventCompetitionData: EventCompetitionUpdateInput
  ): Promise<EventCompetition> {
    if (!user.hasAnyPermission([`edit:competition`])) {
      throw new UnauthorizedException(
        `You do not have permission to add a competition`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.findByPk(
        updateEventCompetitionData.id
      );

      if (!eventCompetitionDb) {
        throw new NotFoundException(
          `${EventCompetition.name}: ${updateEventCompetitionData.id}`
        );
      }

      if (eventCompetitionDb.official !== updateEventCompetitionData.official) {
        const subEvents = await eventCompetitionDb.getSubEventCompetitions({
          transaction,
        });

        // we are making it official
        const ranking = await RankingSystem.findOne({
          where: {
            primary: true,
          },
          transaction,
        });
        const groups = await ranking.getRankingGroups({
          transaction,
        });

        if (updateEventCompetitionData.official == true) {
          for (const subEvent of subEvents) {
            await subEvent.setRankingGroups(groups, {
              transaction,
            });
          }

          for (const group of groups) {
            await this.addGamePointsForSubEvents(
              group,
              subEvents?.map((s) => s.id),
              transaction
            );
          }
        } else {
          // we are making it unofficial
          for (const subEvent of subEvents) {
            await subEvent.removeRankingGroups(groups, {
              transaction,
            });
          }

          // Remove ranking points
          for (const group of groups) {
            await this.removeGamePointsForSubEvents(
              group,
              subEvents?.map((s) => s.id),
              transaction
            );
          }
        }
      }

      // Update db
      const result = await eventCompetitionDb.update(
        updateEventCompetitionData,
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => EventCompetition)
  async copyEventCompetition(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('year', { type: () => Int }) year: number
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
        season: year,
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
      this.logger.error('rollback', e);
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

  async addGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction
  ) {
    const systems = await group.getRankingSystems({ transaction });
    const games = await Game.findAll({
      transaction,
      where: {
        playedAt: {
          [Op.gte]: StartVisualRankingDate,
        },
      },
      include: [
        {
          model: EncounterCompetition,
          required: true,
          include: [
            {
              model: DrawCompetition,
              required: true,
              where: {
                subeventId: {
                  [Op.in]: [...subEvents.map((subEvent) => subEvent)],
                },
              },
            },
          ],
        },
      ],
    });

    for (const system of systems) {
      await RankingPoint.destroy({
        transaction,
        where: {
          systemId: system.id,
          gameId: { [Op.in]: [...games.map((game) => game.id)] },
        },
      });

      const promisse = [];
      for (const game of games) {
        promisse.push(
          this._pointService.createRankingPointforGame(system, game, {
            createRankingPoints: true,
            transaction,
          })
        );
      }

      await Promise.all(promisse);

      this.logger.debug(
        `Added points for ${games.length} games in system ${system.name}(${system.id})`
      );
    }
  }

  async removeGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction
  ) {
    const systems = await group.getRankingSystems({ transaction });

    for (const system of systems) {
      const games = await Game.findAll({
        transaction,
        include: [
          {
            model: EncounterCompetition,
            required: true,
            include: [
              {
                model: DrawCompetition,
                required: true,
                where: {
                  subeventId: {
                    [Op.in]: [...subEvents.map((subEvent) => subEvent)],
                  },
                },
              },
            ],
          },
        ],
      });

      await RankingPoint.destroy({
        transaction,
        where: {
          systemId: system.id,
          gameId: { [Op.in]: [...games.map((game) => game.id)] },
        },
      });

      this.logger.debug(
        `Removed points for ${games.length} games in system ${system.name}(${system.id})`
      );
    }
  }
}
