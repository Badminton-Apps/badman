import { User } from '@badman/backend-authorization';
import {
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Game,
  Player,
  RankingGroup,
  RankingPoint,
  SubEventCompetition,
  SubEventTournament,
} from '@badman/backend-database';
import { PointsService, StartVisualRankingDate } from '@badman/backend-ranking';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => RankingGroup)
export class RankingGroupsResolver {
  private readonly logger = new Logger(RankingGroupsResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private _pointService: PointsService,
  ) {}

  @Query(() => RankingGroup)
  async rankingGroup(@Args('id', { type: () => ID }) id: string): Promise<RankingGroup> {
    const rankingSystemGroup = await RankingGroup.findByPk(id);

    if (!rankingSystemGroup) {
      throw new NotFoundException(id);
    }
    return rankingSystemGroup;
  }

  @Query(() => [RankingGroup])
  async rankingGroups(@Args() listArgs: ListArgs): Promise<RankingGroup[]> {
    return RankingGroup.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() group: RankingGroup,
    @Args() listArgs: ListArgs,
  ): Promise<SubEventCompetition[]> {
    return group.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventTournament])
  async subEventTournaments(
    @Parent() group: RankingGroup,
    @Args() listArgs: ListArgs,
  ): Promise<SubEventTournament[]> {
    return group.getSubEventTournaments(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => RankingGroup)
  async addSubEventsToRankingGroup(
    @User() user: Player,
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string,
    @Args('competitions', { type: () => [ID], nullable: true })
    competitions: string[],
    @Args('tournaments', { type: () => [ID], nullable: true })
    tournaments: string[],
  ) {
    if (!(await user.hasAnyPermission(['add:event']))) {
      throw new UnauthorizedException(
        `You do not have permission to add subevents to a ranking group`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbGroup = await RankingGroup.findByPk(rankingGroupId);
      if (!dbGroup) {
        throw new NotFoundException(`${RankingGroup.name}: ${rankingGroupId}`);
      }

      if (competitions) {
        await dbGroup.addSubEventCompetitions(competitions, { transaction });
        await this.addGamePointsForSubEvents(dbGroup, competitions, transaction);

        // check if the subevent has any remaining subevents with ranking
        await this.checkOfficialComp(competitions, transaction);
      }

      if (tournaments) {
        await dbGroup.addSubEventTournaments(tournaments, { transaction });
        await this.addGamePointsForSubEvents(dbGroup, tournaments, transaction);

        // check if the subevent has any remaining subevents with ranking
        await this.checkOfficialTournament(tournaments, transaction);
      }

      await transaction.commit();
      return dbGroup;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => RankingGroup)
  async removeSubEventsToRankingGroup(
    @User() user: Player,
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string,
    @Args('competitions', { type: () => [ID], nullable: true })
    competitions: string[],
    @Args('tournaments', { type: () => [ID], nullable: true })
    tournaments: string[],
  ) {
    if (!(await user.hasAnyPermission(['remove:event']))) {
      throw new UnauthorizedException(
        `You do not have permission to remove subevents to a ranking group`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbGroup = await RankingGroup.findByPk(rankingGroupId);
      if (!dbGroup) {
        throw new NotFoundException(`${RankingGroup.name}: ${rankingGroupId}`);
      }

      if (competitions) {
        await dbGroup.removeSubEventCompetitions(competitions, { transaction });
        await this.addGamePointsForSubEvents(dbGroup, competitions, transaction);

        // check if the subevent has any remaining subevents with ranking
        await this.checkOfficialComp(competitions, transaction);
      }

      if (tournaments) {
        await dbGroup.removeSubEventTournaments(tournaments, { transaction });
        await this.addGamePointsForSubEvents(dbGroup, tournaments, transaction);

        // check if the subevent has any remaining subevents with ranking
        await this.checkOfficialTournament(tournaments, transaction);
      }

      await transaction.commit();
      return dbGroup;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  private async checkOfficialComp(competitions: string[], transaction: Transaction) {
    const subEvents = await SubEventCompetition.findAll({
      where: {
        id: {
          [Op.in]: competitions,
        },
      },
      include: [
        {
          model: RankingGroup,
          required: false,
        },
      ],
      transaction,
    });

    // if not set the parent's event to official false
    const unqiueEvents = new Set([...subEvents.map((subEvent) => subEvent.eventId)]);
    for (const eventId of unqiueEvents) {
      const remaining = subEvents.filter((subEvent) => subEvent.eventId === eventId);
      if (remaining.length === 0) {
        const event = await EventCompetition.findByPk(eventId);
        if (!event) {
          throw new NotFoundException(`${EventCompetition.name}: ${eventId}`);
        }
        event.official = false;
        await event.save({ transaction });
      }
    }
  }

  private async checkOfficialTournament(tournaments: string[], transaction: Transaction) {
    const subEvents = await SubEventTournament.findAll({
      where: {
        id: {
          [Op.in]: tournaments,
        },
      },
      include: [
        {
          model: RankingGroup,
          required: false,
        },
      ],
      transaction,
    });

    // if not set the parent's event to official false
    const unqiueEvents = new Set([...subEvents.map((subEvent) => subEvent.eventId)]);
    for (const eventId of unqiueEvents) {
      const remaining = subEvents.filter((subEvent) => subEvent.eventId === eventId);
      if (remaining.length === 0) {
        const event = await EventTournament.findByPk(eventId);
        if (!event) {
          throw new NotFoundException(`${EventCompetition.name}: ${eventId}`);
        }
        event.official = false;
        await event.save({ transaction });
      }
    }
  }

  async addGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction,
  ) {
    const systems = await group.getRankingSystems({ transaction });
    const games = (
      await Promise.all([
        Game.findAll({
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
        }),
        Game.findAll({
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
        }),
      ])
    ).flat();

    for (const system of systems) {
      await RankingPoint.destroy({
        transaction,
        where: {
          systemId: system.id,
          gameId: { [Op.in]: [...games.map((game) => game.id)] },
        },
      });

      // const promisse = [];
      // for (const game of games) {
      //   promisse.push(
      //     this._pointService.createRankingPointforGame(system, game, {
      //       createRankingPoints: true,
      //       transaction,
      //     })
      //   );
      // }

      // await Promise.all(promisse);
    }
  }

  async removeGamePointsForSubEvents(
    group: RankingGroup,
    subEvents: string[],
    transaction: Transaction,
  ) {
    const systems = await group.getRankingSystems({ transaction });

    for (const system of systems) {
      const tournamentGames = await Game.findAll({
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

      const competitionGames = await Game.findAll({
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

      const games = [...tournamentGames, ...competitionGames];

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
