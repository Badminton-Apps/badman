import { User } from '@badman/backend-authorization';
import {
  Availability,
  AvailabilityNewInput,
  AvailabilityUpdateInput,
  AvailiblyDayType,
  ExceptionType,
  Location,
  Player,
} from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Availability)
export class AvailabilitysResolver {
  private readonly logger = new Logger(AvailabilitysResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Availability)
  async availability(@Args('id', { type: () => ID }) id: string): Promise<Availability | null> {
    return Availability.findByPk(id);
  }

  @Query(() => [Availability])
  async availabilities(
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: Availability[] }> {
    return Availability.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [AvailiblyDayType], { nullable: true })
  async days(@Parent() availability: Availability) {
    return availability.days?.map((day) => ({
      ...day,
      from: day.from ? new Date(day.from) : undefined,
      to: day.to ? new Date(day.to) : undefined,
    }));
  }

  @ResolveField(() => [ExceptionType], { nullable: true })
  async exceptions(@Parent() availability: Availability) {
    // return availability.exceptions and map the start en end as date
    return availability.exceptions
      ?.filter((exception) => exception?.start && exception?.end)
      ?.map((exception) => ({
        ...exception,
        start: new Date(exception.start as Date),
        end: new Date(exception.end as Date),
      }));
  }

  @Mutation(() => Availability)
  async createAvailability(
    @Args('data') newAvailibilityData: AvailabilityNewInput,
    @User() user: Player,
  ): Promise<Availability> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbLocation = await Location.findByPk(newAvailibilityData.locationId, {
        transaction,
      });

      if (!dbLocation) {
        throw new NotFoundException(`${Location.name}: ${newAvailibilityData.locationId}`);
      }

      if (!(await user.hasAnyPermission([`${dbLocation.clubId}_edit:location`, 'edit-any:club']))) {
        throw new UnauthorizedException(`You do not have permission to change the availiblies`);
      }

      const dbAvailability = await Availability.create({ ...newAvailibilityData }, { transaction });

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
    @User() user: Player,
  ): Promise<Availability> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbAvailability = await Availability.findByPk(updateAvailibilityData.id, {
        include: [
          {
            required: true,
            model: Location,
          },
        ],
        transaction,
      });

      if (!dbAvailability) {
        throw new NotFoundException(`${Availability.name}: ${updateAvailibilityData.id}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbAvailability.location?.clubId}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(`You do not have permission to change the availiblies`);
      }

      // make sure end dates are filled in
      for (const exception of updateAvailibilityData.exceptions ?? []) {
        if (!exception.end && exception.start) {
          exception.end = exception.start;
        }

        if (exception.end && !exception.start) {
          exception.start = exception.end;
        }
      }

      await dbAvailability.update(
        { ...dbAvailability.toJSON(), ...updateAvailibilityData },
        { transaction },
      );

      await transaction.commit();
      return dbAvailability;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
