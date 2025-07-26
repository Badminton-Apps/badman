import { User } from '@badman/backend-authorization';
import {
  Comment,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventCompetitionUpdateInput,
  ExceptionType,
  Game,
  InfoEventType,
  Player,
  RankingGroup,
  RankingPoint,
  RankingSystem,
  SubEventCompetition,
} from '@badman/backend-database';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { PointsService, StartVisualRankingDate } from '@badman/backend-ranking';
import { IsUUID } from '@badman/utils';
import { InjectQueue } from '@nestjs/bull';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { Queue } from 'bull';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEventCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EventCompetition])
  rows?: EventCompetition[];
}
@Resolver(() => EventCompetition)
export class EventCompetitionResolver {
  private readonly logger = new Logger(EventCompetitionResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private _pointService: PointsService,
    @InjectQueue(SyncQueue) private _syncQueue: Queue,
  ) {}

  @Query(() => EventCompetition)
  async eventCompetition(@Args('id', { type: () => ID }) id: string): Promise<EventCompetition> {
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
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: EventCompetition[] }> {
    return EventCompetition.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @Query(() => [Number])
  async eventCompetitionSeasons(): Promise<number[]> {
    return EventCompetition.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('season')), 'season']],
      order: [['season', 'DESC']],
      raw: true,
    }).then((result) => result.map((r) => r.season));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() event: EventCompetition,
    @Args() listArgs: ListArgs,
  ): Promise<SubEventCompetition[]> {
    return event.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Comment])
  async comments(
    @Parent() event: EventCompetition,
    @Args() listArgs: ListArgs,
  ): Promise<Comment[]> {
    return event.getComments(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [ExceptionType], { nullable: true })
  async exceptions(@Parent() event: EventCompetition) {
    // return availability.exceptions and map the start en end as date
    return event.exceptions
      ?.filter((exception) => exception?.start && exception?.end)
      ?.map((exception) => ({
        ...exception,
        start: new Date(exception.start as Date),
        end: new Date(exception.end as Date),
      }));
  }

  @ResolveField(() => [InfoEventType], { nullable: true })
  async infoEvents(@Parent() event: EventCompetition) {
    // return availability.exceptions and map the start en end as date
    return event.infoEvents
      ?.filter((info) => info?.start && info?.end)
      ?.map((info) => ({
        ...info,
        start: new Date(info.start as Date),
        end: new Date(info.end as Date),
      }));
  }

  @Mutation(() => EventCompetition)
  async updateEventCompetition(
    @User() user: Player,
    @Args('data') updateEventCompetitionData: EventCompetitionUpdateInput,
  ): Promise<EventCompetition> {
    if (!(await user.hasAnyPermission([`edit:competition`]))) {
      throw new UnauthorizedException(`You do not have permission to add a competition`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      // find event competition by updateData.id, include subevents
      const eventCompetitionDb = await EventCompetition.findByPk(updateEventCompetitionData.id, {
        include: [{ model: SubEventCompetition }],
        transaction,
      });

      // throw error if not there
      if (!eventCompetitionDb) {
        throw new NotFoundException(`${EventCompetition.name}: ${updateEventCompetitionData.id}`);
      }

      // check if  update data inclues official boolean, and if it is different from the db
      if (updateEventCompetitionData.official != undefined) {
        if (eventCompetitionDb.official !== updateEventCompetitionData.official) {
          const subEvents = await eventCompetitionDb.getSubEventCompetitions({
            transaction,
          });

          // getting the primary ranking system, in order to get the ranking groups, which will be added to each sub event
          const ranking = await RankingSystem.findOne({
            where: {
              primary: true,
            },
            transaction,
          });

          if (!ranking) {
            throw new NotFoundException(`${RankingSystem.name}: primary system not found`);
          }

          const groups = await ranking.getRankingGroups({
            transaction,
          });

          if (updateEventCompetitionData.official) {
            this.logger.debug(`Adding ranking groups and points`);
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
            this.logger.debug(`Added ranking groups and points`);
          } else {
            this.logger.debug(`Removing ranking groups and points`);
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
      }

      // Update db
      const result = await eventCompetitionDb.update(updateEventCompetitionData, { transaction });

      // update subevents
      if (updateEventCompetitionData.subEventCompetitions) {
        for (const subEvent of updateEventCompetitionData.subEventCompetitions) {
          await SubEventCompetition.update(subEvent, {
            where: {
              id: subEvent.id,
            },
            transaction,
          });
        }
      }

      // Commit transaction
      await transaction.commit();

      this.logger.debug(`Updated ${EventCompetition.name}: ${result.id}`);

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
    @Args('year', { type: () => Int }) year: number,
  ) {
    if (!(await user.hasAnyPermission([`add:competition`]))) {
      throw new UnauthorizedException(`You do not have permission to add a competition`);
    }
    const transaction = await this._sequelize.transaction();
    try {
      const eventCompetitionDb = await EventCompetition.findByPk(id, {
        transaction,
        include: [{ model: SubEventCompetition }],
      });

      if (!eventCompetitionDb) {
        throw new NotFoundException(`${EventCompetition.name}: ${id}`);
      }

      const newName = `${eventCompetitionDb.name
        ?.replace(/(\d{4}-\d{4})/gi, '')
        .trim()} ${year}-${year + 1}`;

      // set values to undefined to avoid copying them
      const newEventCompetitionDb = new EventCompetition({
        ...eventCompetitionDb.toJSON(),
        id: undefined,
        visualCode: undefined,
        exceptions: undefined,
        infoEvents: undefined,
        season: year,
        name: newName,
      });

      const newEventCompetitionDbSaved = await newEventCompetitionDb.save({
        transaction,
      });
      const newSubEvents = [];
      for (const subEventCompetition of eventCompetitionDb.subEventCompetitions ?? []) {
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

  @Mutation(() => Boolean)
  async removeEventCompetition(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission([`delete:competition`]))) {
      throw new UnauthorizedException(`You do not have permission to delete a competition`);
    }

    const eventTournament = await EventCompetition.findByPk(id);
    if (!eventTournament) {
      throw new NotFoundException(`${EventCompetition.name}: ${id}`);
    }

    const transaction = await this._sequelize.transaction();

    try {
      const subEvents = await eventTournament.getSubEventCompetitions({
        transaction,
      });

      for (const subEvent of subEvents) {
        const draws = await subEvent.getDrawCompetitions({
          transaction,
        });

        for (const draw of draws) {
          const encounters = await draw.getEncounterCompetitions({
            transaction,
          });

          for (const encounter of encounters) {
            await encounter.destroy({
              transaction,
            });

            const games = await encounter.getGames({
              transaction,
            });

            for (const game of games) {
              await game.destroy({
                transaction,
              });
            }
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
        `Removed points for ${games.length} games in system ${system.name}(${system.id})`,
      );
    }
  }

  @Mutation(() => Boolean)
  async recalculateEventCompetitionRankingPoints(
    @User() user: Player,
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('systemId', { type: () => ID, nullable: true }) systemId: string,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['re-sync:points']))) {
      throw new UnauthorizedException(`You do not have permission to sync points`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const where = systemId ? { id: systemId } : { primary: true };
      const system = await RankingSystem.findOne({
        where,
      });

      if (!system) {
        throw new NotFoundException(`${RankingSystem.name} not found for ${systemId || 'primary'}`);
      }

      // find all games
      const event = await EventCompetition.findByPk(eventId, {
        transaction,
      });

      if (!event) {
        throw new NotFoundException(`${EventCompetition.name}  not found for ${eventId}`);
      }

      const subEvents = await event.getSubEventCompetitions({
        transaction,
        include: [
          {
            model: DrawCompetition,
            include: [{ model: EncounterCompetition, include: [{ model: Game }] }],
          },
        ],
      });

      const games = subEvents.reduce((acc, subEvent) => {
        acc.push(
          ...(subEvent.drawCompetitions?.reduce((acc, draw) => {
            acc.push(
              ...(draw.encounterCompetitions?.reduce((acc, enc) => {
                acc.push(...(enc.games ?? []));
                return acc;
              }, [] as Game[]) ?? []),
            );
            return acc;
          }, [] as Game[]) ?? []),
        );
        return acc;
      }, [] as Game[]);

      for (const game of games ?? []) {
        await this._pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      this.logger.log(`Recalculated ${games.length} ranking points for draw ${eventId}`);

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async recalculateStandingEvent(
    @User() user: Player,
    @Args('eventId', { type: () => ID }) eventId: string,
  ) {
    if (!(await user.hasAnyPermission(['re-sync:points']))) {
      throw new UnauthorizedException(`You do not have permission to sync points`);
    }

    const event = await EventCompetition.findByPk(eventId, {
      attributes: ['id'],
    });

    if (!event) {
      throw new NotFoundException(`${EventCompetition.name}  not found for ${eventId}`);
    }

    await this._syncQueue.add(
      Sync.ScheduleRecalculateStandingCompetitionEvent,
      {
        eventId: event.id,
      },
      {
        removeOnComplete: true,
        removeOnFail: 1,
      },
    );

    return true;
  }
}
