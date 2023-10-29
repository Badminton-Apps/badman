import {
  RankingLastPlace,
  RankingSystem,
  RankingGroup,
  PagedRankingLastPlaces,
  Player,
  RankingSystemUpdateInput,
  RankingPlace,
  RankingPoint,
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
import { Op, Transaction } from 'sequelize';

@CacheControl({ maxAge: 31536000 })
@Resolver(() => RankingSystem)
export class RankingSystemResolver {
  private readonly logger = new Logger(RankingSystemResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => RankingSystem)
  async rankingSystem(
    @Args('id', { type: () => ID }) id: string,
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
    @Args() listArgs: ListArgs,
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
    @Args() listArgs: ListArgs,
  ): Promise<RankingGroup[]> {
    return system.getRankingGroups(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => RankingSystem)
  async updateRankingSystem(
    @User() user: Player,
    @Args('data') updateRankingSystemData: RankingSystemUpdateInput,
  ) {
    if (!(await user.hasAnyPermission(['edit:ranking']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(updateRankingSystemData.id);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${updateRankingSystemData.id}`,
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
          },
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
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string,
  ) {
    if (!(await user.hasAnyPermission(['edit:ranking']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(rankingSystemId);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${rankingSystemId}`,
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
    @Args('rankingGroupId', { type: () => ID }) rankingGroupId: string,
  ) {
    if (!(await user.hasAnyPermission(['edit:ranking']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(rankingSystemId);
      if (!dbSystem) {
        throw new NotFoundException(
          `${RankingSystem.name}: ${rankingSystemId}`,
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

  @Mutation(() => RankingSystem)
  async copyRankingSystem(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('copyFromStartDate', { type: () => Date, nullable: true })
    copyFromStartDate?: Date,
    @Args('copyToEndDate', { type: () => Date, nullable: true })
    copyToEndDate?: Date,
  ) {
    if (!(await user.hasAnyPermission(['edit:ranking']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(id);
      if (!dbSystem) {
        throw new NotFoundException(`${RankingSystem.name}: ${id}`);
      }
      // Each copy will append (Vx) to the name,
      // so we need to find the last one
      const lastSystem = await RankingSystem.findOne({
        where: {
          name: {
            [Op.like]: `${dbSystem.name} (V%)%`,
          },
        },
        order: [['name', 'DESC']],
        transaction,
      });

      let version = 1;
      if (lastSystem) {
        const match = lastSystem.name?.match(/\(V(\d+)\)/);
        if (match) {
          version = parseInt(match[1]) + 1;
        }
      }

      const newSystem = new RankingSystem({
        ...dbSystem.toJSON(),
        id: undefined,
        name: `${dbSystem.name} (V${version})`,
        primary: false,
      });

      await newSystem.save({
        transaction,
      });

      this.logger.debug(`New System ${newSystem.name} (${newSystem.id})`);

      if (copyFromStartDate || copyToEndDate) {
        await this.copyRankingLastPlaces(
          dbSystem.id,
          newSystem.id,
          copyFromStartDate,
          copyToEndDate,
          transaction,
        );

        await this.copyRankingPoints(
          dbSystem.id,
          newSystem.id,
          copyFromStartDate,
          copyToEndDate,
          transaction,
        );

        await this.copyRankingPlaces(
          dbSystem.id,
          newSystem.id,
          copyFromStartDate,
          copyToEndDate,
          transaction,
        );
      }

      // copy ranking groups
      const groups = await dbSystem.getRankingGroups({
        transaction,
      });

      if (groups?.length > 0) {
        await newSystem.addRankingGroups(groups, {
          transaction,
        });
      }

      await transaction.commit();
      this.logger.log(`Copied system ${dbSystem.name} to ${newSystem.name}`);
      return dbSystem;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  private async copyRankingPlaces(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    const chunkSize = 100000;
    const toCopyPlaces = await RankingPlace.count({
      where: {
        systemId: currenSystemId,
        rankingDate: {
          [Op.between]: [copyFromStartDate, copyToEndDate],
        },
      },
      transaction,
    });

    let offset = 0;
    while (offset < toCopyPlaces) {
      this.logger.debug(`Copy places ${offset}/${toCopyPlaces}`);
      const places = await RankingPlace.findAll({
        where: {
          systemId: currenSystemId,
          rankingDate: {
            [Op.between]: [copyFromStartDate, copyToEndDate],
          },
        },
        order: [['id', 'ASC']],
        limit: chunkSize,
        offset,
        transaction,
      });

      if (places?.length > 0) {
        await RankingPlace.bulkCreate(
          places.map((place) => ({
            ...place.toJSON(),
            id: undefined,
            systemId: newSystemId,
          })),
          {
            transaction,
            hooks: false,
          },
        );
      }

      offset += chunkSize;
    }
  }

  private async copyRankingLastPlaces(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    const chunkSize = 100000;
    const toCopyPlaces = await RankingLastPlace.count({
      where: {
        systemId: currenSystemId,
        rankingDate: {
          [Op.between]: [copyFromStartDate, copyToEndDate],
        },
      },
      transaction,
    });

    let offset = 0;
    while (offset < toCopyPlaces) {
      this.logger.debug(`Copy last places ${offset}/${toCopyPlaces}`);
      const places = await RankingLastPlace.findAll({
        where: {
          systemId: currenSystemId,
          rankingDate: {
            [Op.between]: [copyFromStartDate, copyToEndDate],
          },
        },
        order: [['id', 'ASC']],
        limit: chunkSize,
        offset,
        transaction,
      });

      if (places?.length > 0) {
        await RankingLastPlace.bulkCreate(
          places.map((place) => ({
            ...place.toJSON(),
            id: undefined,
            systemId: newSystemId,
          })),
          {
            hooks: false,
            transaction,
          },
        );
      }

      offset += chunkSize;
    }
  }

  private async copyRankingPoints(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    const chunkSize = 100000;
    const toCopyPoints = await RankingPoint.count({
      where: {
        systemId: currenSystemId,
        rankingDate: {
          [Op.between]: [copyFromStartDate, copyToEndDate],
        },
      },
      transaction,
    });

    let offset = 0;
    while (offset < toCopyPoints) {
      this.logger.debug(`Copy points ${offset}/${toCopyPoints}`);
      const points = await RankingPoint.findAll({
        where: {
          systemId: currenSystemId,
          rankingDate: {
            [Op.between]: [copyFromStartDate, copyToEndDate],
          },
        },
        limit: chunkSize,
        order: [['id', 'ASC']],
        offset,
        transaction,
      });

      if (points?.length > 0) {
        await RankingPoint.bulkCreate(
          points.map((place) => ({
            ...place.toJSON(),
            id: undefined,
            systemId: newSystemId,
          })),
          {
            transaction,
            hooks: false,
          },
        );
      }

      offset += chunkSize;
    }
  }

  @Mutation(() => Boolean)
  async removeRankingSystem(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!(await user.hasAnyPermission(['edit:ranking']))) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`,
      );
    }
    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const dbSystem = await RankingSystem.findByPk(id);
      if (!dbSystem) {
        throw new NotFoundException(`${RankingSystem.name}: ${id}`);
      }

      await dbSystem.destroy({
        transaction,
      });

      await transaction.commit();
      return true;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
