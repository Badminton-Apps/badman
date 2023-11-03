import { User } from '@badman/backend-authorization';
import {
  DrawTournament,
  EventTournament,
  EventTournamentUpdateInput,
  Game,
  Player,
  RankingGroup,
  RankingPoint,
  RankingSystem,
  SubEventTournament,
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
export class PagedEventTournament {
  @Field(() => Int)
  count?: number;

  @Field(() => [EventTournament])
  rows?: EventTournament[];
}

@Resolver(() => EventTournament)
export class EventTournamentResolver {
  private readonly logger = new Logger(EventTournamentResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private _pointService: PointsService,
  ) {}

  @Query(() => EventTournament)
  async eventTournament(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<EventTournament> {
    const eventTournament = IsUUID(id)
      ? await EventTournament.findByPk(id)
      : await EventTournament.findOne({
          where: {
            slug: id,
          },
        });

    if (!eventTournament) {
      throw new NotFoundException(id);
    }
    return eventTournament;
  }

  @Query(() => PagedEventTournament)
  async eventTournaments(
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: EventTournament[] }> {
    return EventTournament.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventTournament])
  async subEventTournaments(
    @Parent() event: EventTournament,
    @Args() listArgs: ListArgs,
  ): Promise<SubEventTournament[]> {
    return event.getSubEventTournaments(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => EventTournament)
  async updateEventTournament(
    @User() user: Player,
    @Args('data') updateEventTournamentData: EventTournamentUpdateInput,
  ): Promise<EventTournament> {
    if (!(await user.hasAnyPermission([`edit-any:tournament`]))) {
      throw new UnauthorizedException(
        `You do not have permission to add a tournament`,
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const eventTournamentDb = await EventTournament.findByPk(
        updateEventTournamentData.id,
      );

      if (!eventTournamentDb) {
        throw new NotFoundException(
          `${EventTournament.name}: ${updateEventTournamentData.id}`,
        );
      }

      if (eventTournamentDb.official !== updateEventTournamentData.official) {
        const subEvents = await eventTournamentDb.getSubEventTournaments({
          transaction,
        });

        // we are making it official
        const ranking = await RankingSystem.findOne({
          where: {
            primary: true,
          },
          transaction,
        });

        if (!ranking) {
          throw new NotFoundException(`${RankingSystem.name}: primary`);
        }

        const groups = await ranking.getRankingGroups({
          transaction,
        });

        if (updateEventTournamentData.official == true) {
          for (const subEvent of subEvents) {
            await subEvent.setRankingGroups(groups, {
              transaction,
            });
          }

          for (const group of groups) {
            await this.addGamePointsForSubEvents(
              group,
              subEvents?.map((s) => s.id),
              transaction,
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
              transaction,
            );
          }
        }
      }

      // Update db
      const result = await eventTournamentDb.update(updateEventTournamentData, {
        transaction,
      });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  // @Mutation(returns => EventTournament)
  // async addEventTournament(
  //   @Args('newEventTournamentData') newEventTournamentData: NewEventTournamentInput,
  // ): Promise<EventTournament> {
  //   const recipe = await this.recipesService.create(newEventTournamentData);
  //   return recipe;
  // }

  @Mutation(() => Boolean)
  async removeEventTournament(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!(await user.hasAnyPermission([`delete-any:tournament`]))) {
      throw new UnauthorizedException(
        `You do not have permission to detele a tournament`,
      );
    }

    const eventTournament = await EventTournament.findByPk(id);
    if (!eventTournament) {
      throw new NotFoundException(`${EventTournament.name}: ${id}`);
    }

    const transaction = await this._sequelize.transaction();

    try {
      const subEvents = await eventTournament.getSubEventTournaments({
        transaction,
      });

      for (const subEvent of subEvents) {
        const draws = await subEvent.getDrawTournaments({
          transaction,
        });

        for (const draw of draws) {
          const games = await draw.getGames({
            transaction,
          });

          for (const game of games) {
            await game.destroy({
              transaction,
            });
          }

          await draw.destroy({
            transaction,
          });
        }

        await subEvent.destroy({
          transaction,
        });
      }

      await eventTournament.destroy({
        transaction,
      });

      await transaction.commit();

      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async addGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction,
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
          model: DrawTournament,
          required: true,
          where: {
            subeventId: {
              [Op.in]: [...subEvents.map((subEvent) => subEvent)],
            },
          },
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
            transaction,
          }),
        );
      }

      await Promise.all(promisse);

      this.logger.debug(
        `Added points for ${games.length} games in system ${system.name}(${system.id})`,
      );
    }
  }

  async removeGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction,
  ) {
    const systems = await group.getRankingSystems({ transaction });

    for (const system of systems) {
      const games = await Game.findAll({
        transaction,
        include: [
          {
            model: DrawTournament,
            required: true,
            where: {
              subeventId: {
                [Op.in]: [...subEvents.map((subEvent) => subEvent)],
              },
            },
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
        `Removed points for ${games.length} games in system ${system.name}(${system.id})`,
      );
    }
  }
}
