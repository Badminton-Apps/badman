import { Game, Player, RankingPoint, RankingSystem } from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import { User } from '@badman/backend-authorization';
import { Sequelize } from 'sequelize-typescript';
import { PointsService } from '@badman/backend-ranking';

@Resolver(() => RankingPoint)
export class RankingPointResolver {
  protected readonly logger = new Logger(RankingPointResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private pointService: PointsService,
  ) {}

  @Query(() => RankingPoint)
  async rankingPoint(@Args('id', { type: () => ID }) id: string): Promise<RankingPoint> {
    let rankingPoint = await RankingPoint.findByPk(id);

    if (!rankingPoint) {
      rankingPoint = await RankingPoint.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingPoint) {
      throw new NotFoundException(id);
    }
    return rankingPoint;
  }

  @Query(() => [RankingPoint])
  async rankingPoints(@Args() listArgs: ListArgs): Promise<RankingPoint[]> {
    return RankingPoint.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Player)
  async player(@Parent() rankingPoint: RankingPoint): Promise<Player> {
    return rankingPoint.getPlayer();
  }

  @ResolveField(() => RankingSystem)
  async system(@Parent() rankingPoint: RankingPoint): Promise<RankingSystem> {
    return rankingPoint.getSystem();
  }

  @Mutation(() => Boolean)
  async recalculateRankingPoints(
    @User() user: Player,
    @Args('gameId', { type: () => [ID] }) gameId: string[],
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
        throw new NotFoundException(`No ranking system found for ${systemId || 'primary'}`);
      }

      // find all games
      const games = await Game.findAll({
        where: {
          id: gameId,
        },
      });

      for (const game of games) {
        await this.pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}
