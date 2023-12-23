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
        `You do not have permission to copy a system`,
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
    this.logger.debug(
      `Copy places from ${currenSystemId} to ${newSystemId} between ${copyFromStartDate} and ${copyToEndDate}`,
    );

    // get all column names
    const columns = (await this._sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'ranking'
      AND table_name   = 'RankingPlaces'
    `,
      {
        type: 'SELECT',
        transaction,
      },
    )) as { column_name: string }[];

    await this._sequelize.query(
      `
      CREATE TEMPORARY TABLE temp_places AS
      SELECT  uuid_generate_v4() as "id", ${columns
        .filter((c) => c.column_name !== 'id')
        .map((c) => `"${c.column_name}"`)
        .join(', ')}
      FROM "ranking"."RankingPlaces"
      WHERE "systemId" = '${currenSystemId}'
      AND "rankingDate" BETWEEN '${copyFromStartDate?.toISOString()}' AND '${copyToEndDate?.toISOString()}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Created temp table`);

    await this._sequelize.query(
      `
      UPDATE temp_places
      SET "systemId" = '${newSystemId}' 
    `,
      {
        transaction,
      },
    );

    // generate new ids

    this.logger.verbose(`Updated temp table`);

    await this._sequelize.query(
      `
      INSERT INTO "ranking"."RankingPlaces"
      SELECT * FROM temp_places 
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Inserted temp table`);

    // drop temp table
    await this._sequelize.query(
      `
      DROP TABLE temp_places
    `,
      {
        transaction,
      },
    );
  }

  private async copyRankingLastPlaces(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    this.logger.debug(
      `Copy last places from ${currenSystemId} to ${newSystemId} between ${copyFromStartDate} and ${copyToEndDate}`,
    );

    // get all column names
    const columns = (await this._sequelize.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'ranking'
        AND table_name   = 'RankingLastPlaces'
      `,
      {
        type: 'SELECT',
        transaction,
      },
    )) as { column_name: string }[];

    await this._sequelize.query(
      `
      CREATE TEMPORARY TABLE temp_last_places AS
      SELECT  uuid_generate_v4() as "id", ${columns
        .filter((c) => c.column_name !== 'id')
        .map((c) => `"${c.column_name}"`)
        .join(', ')}
      FROM "ranking"."RankingLastPlaces"
      WHERE "systemId" = '${currenSystemId}'
      AND "rankingDate" BETWEEN '${copyFromStartDate?.toISOString()}' AND '${copyToEndDate?.toISOString()}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Created temp table`);

    await this._sequelize.query(
      `
      UPDATE temp_last_places
      SET "systemId" = '${newSystemId}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Updated temp table`);

    await this._sequelize.query(
      `
      INSERT INTO "ranking"."RankingLastPlaces"
      SELECT * FROM temp_last_places
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Inserted temp table`);

    // drop temp table
    await this._sequelize.query(
      `
      DROP TABLE temp_last_places
    `,
      {
        transaction,
      },
    );
  }

  private async copyRankingPoints(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    this.logger.debug(
      `Copy Points from ${currenSystemId} to ${newSystemId} between ${copyFromStartDate} and ${copyToEndDate}`,
    );

    // get all column names
    const columns = (await this._sequelize.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'ranking'
        AND table_name   = 'RankingPoints'
      `,
      {
        type: 'SELECT',
        transaction,
      },
    )) as { column_name: string }[];

    await this._sequelize.query(
      `
      CREATE TEMPORARY TABLE temp_points AS
      SELECT  uuid_generate_v4() as "id", ${columns
        .filter((c) => c.column_name !== 'id')
        .map((c) => `"${c.column_name}"`)
        .join(', ')}
      FROM "ranking"."RankingPoints"
      WHERE "systemId" = '${currenSystemId}'
      AND "rankingDate" BETWEEN '${copyFromStartDate?.toISOString()}' AND '${copyToEndDate?.toISOString()}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Created temp table`);

    await this._sequelize.query(
      `
      UPDATE temp_points
      SET "systemId" = '${newSystemId}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Updated temp table`);

    await this._sequelize.query(
      `
      INSERT INTO "ranking"."RankingPoints"
      SELECT * FROM temp_points
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Inserted temp table`);

    // drop temp table
    await this._sequelize.query(
      `
      DROP TABLE temp_points
    `,
      {
        transaction,
      },
    );
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
