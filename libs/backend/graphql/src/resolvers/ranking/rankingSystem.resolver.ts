import {
  RankingLastPlace,
  RankingSystem,
  RankingGroup,
  PagedRankingLastPlaces,
  Player,
  RankingSystemUpdateInput,
} from '@badman/backend-database';
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
import { User } from '@badman/backend-authorization';
import { ListArgs } from '../../utils';
import { CacheControl } from '../../decorators';
@CacheControl({ maxAge: 31536000 })
@Resolver(() => RankingSystem)
export class RankingSystemResolver {
  private readonly logger = new Logger(RankingSystemResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => RankingSystem)
  async rankingSystem(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingSystem> {
    const rankingSystem = await RankingSystem.findByPk(id);

    if (!rankingSystem) {
      throw new NotFoundException(id);
    }
    return rankingSystem;
  }

  @Query(() => [RankingSystem])
  async rankingSystems(@Args() listArgs: ListArgs): Promise<RankingSystem[]> {
    return RankingSystem.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => PagedRankingLastPlaces)
  async rankingLastPlaces(
    @Parent() system: RankingSystem,
    @Args() listArgs: ListArgs
  ): Promise<{
    count: number;
    rows: RankingLastPlace[];
  }> {
    const options = ListArgs.toFindOptions(listArgs);
    options.where = {
      systemId: system.id,
      ...options.where,
    };
    return RankingLastPlace.findAndCountAll(options);
  }

  @ResolveField(() => [RankingGroup])
  async rankingGroups(
    @Parent() system: RankingSystem,
    @Args() listArgs: ListArgs
  ): Promise<RankingGroup[]> {
    return system.getRankingGroups(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => RankingSystem)
  async updateRankingSystem(
    @User() user: Player,
    @Args('data') updateRankingSystemData: RankingSystemUpdateInput
  ) {
    if (!await user.hasAnyPermission(['edit:ranking'])) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(updateRankingSystemData.id);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${updateRankingSystemData.id}`
        );
      }

      // New system is now primary
      if (updateRankingSystemData.primary == true) {
        // Set other systems to false
        await RankingSystem.update(
          { primary: false },
          {
            where: {
              primary: true,
            },
            transaction,
          }
        );
      }

      // Update system
      await dbSystem.update(updateRankingSystemData, {
        transaction,
      });

      const dbEvent = await RankingSystem.findByPk(updateRankingSystemData.id, {
        transaction,
      });

      await transaction.commit();
      return dbEvent;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => RankingSystem)
  async addRankingGroupToRankingSystem(
    @User() user: Player,
    @Args('rankingSystemId', { type: () => ID }) rankingSystemId: string,
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string
  ) {
    if (!await user.hasAnyPermission(['edit:ranking'])) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(rankingSystemId);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${rankingSystemId}`
        );
      }

      const dbGroup = await RankingGroup.findByPk(rankingGroupId);
      if (!dbGroup) {
        throw new NotFoundException(`${RankingGroup.name}: ${rankingGroupId}`);
      }

      await dbSystem.addRankingGroup(dbGroup, {
        transaction,
      });

      const dbEvent = await RankingSystem.findByPk(rankingSystemId, {
        transaction,
      });

      await transaction.commit();
      return dbEvent;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => RankingSystem)
  async removeRankingGroupToRankingSystem(
    @User() user: Player,
    @Args('rankingSystemId', { type: () => ID }) rankingSystemId: string,
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string
  ) {
    if (!await user.hasAnyPermission(['edit:ranking'])) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(rankingSystemId);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${rankingSystemId}`
        );
      }

      const dbGroup = await RankingGroup.findByPk(rankingGroupId);
      if (!dbGroup) {
        throw new NotFoundException(`${RankingGroup.name}: ${rankingGroupId}`);
      }


      await dbSystem.removeRankingGroup(dbGroup, {
        transaction,
      });

      const dbEvent = await RankingSystem.findByPk(rankingSystemId, {
        transaction,
      });

      await transaction.commit();
      return dbEvent;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
