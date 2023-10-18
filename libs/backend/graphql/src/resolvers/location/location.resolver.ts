import {
  Availability,
  Club,
  Location,
  LocationNewInput,
  LocationUpdateInput,
  Player,
} from '@badman/backend-database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  Field,
  Float,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '@badman/backend-authorization';
import { ListArgs } from '../../utils';
import { Geometry } from 'geojson';

@ObjectType()
export class Coordinates {
  @Field(() => Float)
  latitude?: number;

  @Field(() => Float)
  longitude?: number;
}

@Resolver(() => Location)
export class LocationResolver {
  private readonly logger = new Logger(LocationResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Location)
  async location(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Location | null> {
    return Location.findByPk(id);
  }

  @Query(() => [Location])
  async locations(@Args() listArgs: ListArgs): Promise<Location[]> {
    return Location.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Coordinates, { nullable: true })
  coordinates(@Parent() location: Location): Coordinates {
    return {
      latitude: location.coordinates?.coordinates[1],
      longitude: location.coordinates?.coordinates[0],
    };
  }

  @ResolveField(() => [Availability])
  async availibilities(
    @Parent() location: Location,
    @Args() listArgs: ListArgs,
  ): Promise<Availability[]> {
    return location.getAvailabilities(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Club)
  async club(@Parent() location: Location): Promise<Club> {
    return location.getClub();
  }

  @Mutation(() => Location)
  async createLocation(
    @Args('data') newLocationData: LocationNewInput,
    @User() user: Player,
  ): Promise<Location> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbClub = await Club.findByPk(newLocationData.clubId, {
        transaction,
      });

      if (!dbClub) {
        throw new NotFoundException(`${Club.name}: ${newLocationData.clubId}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbClub.id}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      const dbLocation = await Location.create(
        {
          ...newLocationData,
          coordinates: newLocationData.coordinates
            ? ({
                type: 'Point',
                coordinates: [
                  newLocationData.coordinates.longitude,
                  newLocationData.coordinates.latitude,
                ],
              } as Geometry)
            : undefined,
        },
        { transaction },
      );

      await transaction.commit();
      return dbLocation;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Location)
  async updateLocation(
    @Args('data') updateLocationData: LocationUpdateInput,
    @User() user: Player,
  ): Promise<Location> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbLocation = await Location.findByPk(updateLocationData.id);

      if (!dbLocation) {
        throw new NotFoundException(
          `${Location.name}: ${updateLocationData.id}`,
        );
      }

      if (
        !(await user.hasAnyPermission([
          `${dbLocation.clubId}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      await dbLocation.update(
        {
          ...dbLocation.toJSON(),
          ...updateLocationData,
          coordinates: updateLocationData.coordinates
            ? ({
                type: 'Point',
                coordinates: [
                  updateLocationData.coordinates.longitude,
                  updateLocationData.coordinates.latitude,
                ],
              } as Geometry)
            : undefined,
        },
        { transaction },
      );

      // await dbLocation.update(location, { transaction });
      await transaction.commit();
      return dbLocation;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Boolean)
  async removeLocation(
    @Args('id', { type: () => ID }) id: string,
    @User() user: Player,
  ): Promise<boolean> {
    const transaction = await this._sequelize.transaction();
    try {
      const dbLocation = await Location.findByPk(id, { transaction });

      if (!dbLocation) {
        throw new NotFoundException(`${Location.name}: ${id}`);
      }

      if (
        !(await user.hasAnyPermission([
          `${dbLocation.clubId}_edit:location`,
          'edit-any:club',
        ]))
      ) {
        throw new UnauthorizedException(
          `You do not have permission to add a competition`,
        );
      }

      await dbLocation.destroy({ transaction });
      await transaction.commit();
      return true;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
