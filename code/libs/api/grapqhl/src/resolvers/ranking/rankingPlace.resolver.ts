import {
  Player,
  RankingPlace,
  RankingPlaceNewInput,
  RankingPlaceUpdateInput,
  RankingSystem,
} from '@badman/api/database';
import {
  Inject,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  private readonly logger = new Logger(RankingPlaceResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => RankingPlace)
  async rankingPlace(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingPlace> {
    let rankingPlace = await RankingPlace.findByPk(id);

    if (!rankingPlace) {
      rankingPlace = await RankingPlace.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingPlace) {
      throw new NotFoundException(id);
    }
    return rankingPlace;
  }

  @Query(() => [RankingPlace])
  async rankingPlaces(@Args() listArgs: ListArgs): Promise<RankingPlace[]> {
    return RankingPlace.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => RankingSystem)
  async rankingSystem(
    @Parent() rankingPlace: RankingPlace
  ): Promise<RankingSystem> {
    return rankingPlace.getRankingSystem();
  }

  @ResolveField(() => Player)
  async player(@Parent() rankingPlace: RankingPlace): Promise<Player> {
    return rankingPlace.getPlayer();
  }

  @Mutation(() => Player)
  async updateRankingPlace(
    @User() user: Player,
    @Args('data')
    updateRankingPlaceData: RankingPlaceUpdateInput
  ) {
    if (
      !user.hasAnyPermission([
        `${updateRankingPlaceData.playerId}_edit:player`,
        'edit-any:player',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const rankingPlace = await RankingPlace.findByPk(
        updateRankingPlaceData.id,
        {
          transaction,
        }
      );

      if (!rankingPlace) {
        throw new NotFoundException(
          `${RankingPlace.name}: ${updateRankingPlaceData.id}`
        );
      }

      // Update rankingPlace
      await rankingPlace.update(updateRankingPlaceData, {
        transaction,
      });

      const player = await Player.findByPk(rankingPlace.playerId, {
        transaction,
      });

      if (!player) {
        throw new NotFoundException(`${Player.name}: ${rankingPlace.playerId}`);
      }

      // Commit transaction
      await transaction.commit();

      return player;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Player)
  async newRankingPlace(
    @User() user: Player,
    @Args('data') newRankingPlaceData: RankingPlaceNewInput
  ) {
    if (
      !user.hasAnyPermission([
        `${newRankingPlaceData.playerId}_edit:player`,
        'edit-any:player',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const player = await Player.findByPk(newRankingPlaceData.playerId, {
        transaction,
      });

      if (!player) {
        throw new NotFoundException(
          `${Player.name}: ${newRankingPlaceData.playerId}`
        );
      }

      // Update club
      await RankingPlace.create({ ...newRankingPlaceData }, { transaction });

      // Commit transaction
      await transaction.commit();

      return player;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  // @Mutation(returns => RankingPlace)
  // async RankingPlace(
  //   @Args('RankingPlaceData') RankingPlaceData: RankingPlaceInput,
  // ): Promise<RankingPlace> {
  //   const recipe = await this.recipesService.create(RankingPlaceData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingPlace(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
