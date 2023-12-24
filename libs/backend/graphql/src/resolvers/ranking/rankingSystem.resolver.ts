import {
  RankingLastPlace,
  RankingSystem,
  RankingGroup,
  PagedRankingLastPlaces,
  Player,
  RankingSystemUpdateInput,
  RankingPoint,
  RankingPlace,
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
import moment from 'moment';

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
        await this._copyPlaces(
          dbSystem,
          newSystem,
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

      await transaction?.commit();
      this.logger.log(`Copied system ${dbSystem.name} to ${newSystem.name}`);
      return dbSystem;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction?.rollback();
      throw e;
    }
  }

  @Mutation(() => RankingSystem)
  async copyPlacesPoints(
    @User() user: Player,
    @Args('source', { type: () => ID }) source: string,
    @Args('destination', { type: () => ID }) destination: string,
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
      const sourceSystem = await RankingSystem.findByPk(source);
      if (!sourceSystem) {
        throw new NotFoundException(`${RankingSystem.name}: ${source}`);
      }

      const destinationSystem = await RankingSystem.findByPk(destination);
      if (!destinationSystem) {
        throw new NotFoundException(`${RankingSystem.name}: ${destination}`);
      }

      if (copyFromStartDate || copyToEndDate) {
        // remove all places and points
        await this._copyPlaces(
          sourceSystem,
          destinationSystem,
          copyFromStartDate,
          copyToEndDate,
          transaction,
        );
      }

      await transaction?.commit();
      this.logger.log(
        `Copied places ${sourceSystem.name} to ${destinationSystem.name}`,
      );
      return sourceSystem;
    } catch (e) {
      this.logger.error('rollback', e);
      await transaction?.rollback();
      throw e;
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

  private async _copyPlaces(
    sourceSystem: RankingSystem,
    destinationSystem: RankingSystem,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction,
  ) {
    await RankingLastPlace.destroy({
      where: {
        systemId: destinationSystem.id,
        rankingDate: {
          [Op.and]: [
            {
              [Op.gte]: copyFromStartDate,
            },
            {
              [Op.lt]: copyToEndDate,
            },
          ],
        },
      },
      transaction,
    });

    await RankingPoint.destroy({
      where: {
        systemId: destinationSystem.id,
        rankingDate: {
          [Op.and]: [
            {
              [Op.gte]: copyFromStartDate,
            },
            {
              [Op.lt]: copyToEndDate,
            },
          ],
        },
      },
      transaction,
    });

    await RankingPlace.destroy({
      where: {
        systemId: destinationSystem.id,
        rankingDate: {
          [Op.and]: [
            {
              [Op.gte]: copyFromStartDate,
            },
            {
              [Op.lt]: copyToEndDate,
            },
          ],
        },
      },
      transaction,
    });

    const dates = this._chunkedDates(copyFromStartDate, copyToEndDate);

    for (const { from, to } of dates) {
      this.logger.debug(
        `Copy places and points from ${sourceSystem.name} to ${destinationSystem.name} between ${from} and ${to}`,
      );
      await this._copyRankingLastPlaces(
        sourceSystem.id,
        destinationSystem.id,
        from,
        to,
        transaction,
      );

      await this._copyRankingPoints(
        sourceSystem.id,
        destinationSystem.id,
        from,
        to,
        transaction,
      );

      await this._copyRankingPlaces(
        sourceSystem.id,
        destinationSystem.id,
        from,
        to,
        transaction,
      );

      this.logger.debug(
        `Copied places and points from ${sourceSystem.name} to ${destinationSystem.name} between ${from} and ${to}`,
      );
    }
  }

  private async _copyRankingPlaces(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction | undefined,
  ) {
    this.logger.verbose(
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
      AND "rankingDate" > '${copyFromStartDate?.toISOString()}' AND  "rankingDate" <= '${copyToEndDate?.toISOString()}'

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

  private async _copyRankingLastPlaces(
    sourceSystemId: string,
    destinationSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction | undefined,
  ) {
    this.logger.verbose(
      `Copy last places from ${sourceSystemId} to ${destinationSystemId} between ${copyFromStartDate} and ${copyToEndDate}`,
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
      WHERE "systemId" = '${sourceSystemId}'
      AND "rankingDate" > '${copyFromStartDate?.toISOString()}' AND  "rankingDate" <= '${copyToEndDate?.toISOString()}'
    `,
      {
        transaction,
      },
    );

    this.logger.verbose(`Created temp table`);

    await this._sequelize.query(
      `
      UPDATE temp_last_places
      SET "systemId" = '${destinationSystemId}'
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

  private async _copyRankingPoints(
    currenSystemId: string,
    newSystemId: string,
    copyFromStartDate: Date | undefined,
    copyToEndDate: Date | undefined,
    transaction: Transaction | undefined,
  ) {
    this.logger.verbose(
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
      AND "rankingDate" > '${copyFromStartDate?.toISOString()}' AND  "rankingDate" <= '${copyToEndDate?.toISOString()}'

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

  /**
   * Splits up the dates into chunks of max 1 month
   *
   * @param from Start date
   * @param to End date
   */
  private _chunkedDates(from: Date | undefined, to: Date | undefined) {
    const dates: { from: Date; to: Date }[] = [];
    let current = moment(from);
    const end = moment(to);

    while (current < end) {
      const from = moment(current);
      const to = moment(current).add(1, 'month');
      dates.push({
        from: from.toDate(),
        to: to.toDate(),
      });
      current = to;
    }

    if (dates.length >= 1) {
      // the last chunk should end at the to date
      dates[dates.length - 1].to = end.toDate();
    }
    return dates;
  }
}
