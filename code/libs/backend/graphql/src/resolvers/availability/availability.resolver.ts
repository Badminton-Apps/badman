import {
  Availability,
  AvailabilityException,
  AvailabilityNewInput,
  AvailabilityUpdateInput,
  ExceptionType,
  Location,
  Player,
} from '@badman/backend/database';
import { User } from '@badman/backend/authorization';
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
import { ListArgs } from '../../utils';

@Resolver(() => Availability)
export class AvailabilitysResolver {
  private readonly logger = new Logger(AvailabilitysResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Availability)
  async availability(
    @Args('id', { type: () => ID }) id: string
  ): Promise<Availability> {
    return await Availability.findByPk(id);
  }

  @Query(() => [Availability])
  async availabilities(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Availability[] }> {
    return Availability.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  // @ResolveField(() => [AvailiblyDayType])
  // async days(@Parent() availability: Availability): Promise<AvailiblyDay[]> {
  //   return availability.days;
  // }

  @ResolveField(() => [ExceptionType])
  async exceptions(
    @Parent() availability: Availability
  ): Promise<AvailabilityException[]> {
    return availability.exceptions?.map((e) => {
      return {
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      };
    });
  }

  @Mutation(() => Availability)
  async createAvailability(
    @Args('data') newAvailibilityData: AvailabilityNewInput,
    @User() user: Player
  ): Promise<Availability> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbLocation = await Location.findByPk(
        newAvailibilityData.locationId,
        {
          transaction,
        }
      );

      if (!dbLocation) {
        throw new NotFoundException(
          `${Location.name}: ${newAvailibilityData.locationId}`
        );
      }

      if (
        !user.hasAnyPermission([
          `${dbLocation.clubId}_edit:location`,
          'edit-any:club',
        ])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      const dbAvailability = await Availability.create(
        { ...newAvailibilityData },
        { transaction }
      );

      await transaction.commit();
      return dbAvailability;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Availability)
  async updateAvailability(
    @Args('data') updateAvailibilityData: AvailabilityUpdateInput,
    @User() user: Player
  ): Promise<Availability> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbAvailability = await Availability.findByPk(
        updateAvailibilityData.id,
        {
          include: [
            {
              required: true,
              model: Location,
            },
          ],
          transaction,
        }
      );

      if (!dbAvailability) {
        throw new NotFoundException(
          `${Availability.name}: ${updateAvailibilityData.id}`
        );
      }

      if (
        !user.hasAnyPermission([
          `${dbAvailability.location.clubId}_edit:location`,
          'edit-any:club',
        ])
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`
        );
      }

      await dbAvailability.update(
        { ...dbAvailability.toJSON(), ...updateAvailibilityData },
        { transaction }
      );

      // await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbAvailability;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
