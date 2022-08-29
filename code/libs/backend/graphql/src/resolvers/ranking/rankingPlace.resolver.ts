import {
  Player,
  RankingPlace,
  RankingPlaceNewInput,
  RankingPlaceUpdateInput,
  RankingSystem,
} from '@badman/backend/database';
import {
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
import { User } from '@badman/backend/authorization';
import { ListArgs } from '../../utils';

@Resolver(() => RankingPlace)
export class RankingPlaceResolver {
  private readonly logger = new Logger(RankingPlaceResolver.name);

  constructor(private _sequelize: Sequelize) {}

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

  @Mutation(() => RankingPlace)
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

      return rankingPlace;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => RankingPlace)
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
      const place = await RankingPlace.create(
        { ...newRankingPlaceData },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      return place;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
  @Mutation(() => Boolean)
  async removeRankingPlace(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ) {
    const rankingPlace = await RankingPlace.findByPk(id);

    if (!rankingPlace) {
      throw new NotFoundException(`${RankingPlace.name}: ${id}`);
    }

    if (
      !user.hasAnyPermission([
        `${rankingPlace.playerId}_edit:player`,
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
      // Update rankingPlace
      await rankingPlace.destroy({
        transaction,
      });

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
