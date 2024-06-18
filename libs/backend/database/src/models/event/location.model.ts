import { Field, Float, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import type { Point } from 'geojson';
import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  CreationOptional,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { Relation } from '../../wrapper';
import { Club } from '../club.model';
import { Team } from '../team.model';
import { Availability } from './availability.model';
import { Court } from './court.model';
import { EventTournament } from './tournament';
import { LocationEventTournamentMembership } from './tournament/location-event-membership.model';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A Location' })
export class Location extends Model<InferAttributes<Location>, InferCreationAttributes<Location>> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  address?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  street?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  streetNumber?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  postalcode?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  city?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  state?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  phone?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  fax?: string;

  @Column(DataType.GEOMETRY('POINT', 4326))
  coordinates?: Point;

  @HasMany(() => Team, 'prefferedLocationId')
  teams?: Relation<Team[]>;

  @BelongsToMany(() => EventTournament, () => LocationEventTournamentMembership)
  eventTournaments?: Relation<EventTournament[]>;

  @HasMany(() => Court, 'locationId')
  courts?: Court;

  @BelongsTo(() => Club, 'clubId')
  club?: Relation<Club>;

  @ForeignKey(() => Club)
  @Index
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  clubId?: string;

  @HasMany(() => Availability)
  availabilities?: Availability[];

  // Has many Availability
  getAvailabilities!: HasManyGetAssociationsMixin<Availability>;
  setAvailabilities!: HasManySetAssociationsMixin<Availability, string>;
  addAvailabilities!: HasManyAddAssociationsMixin<Availability, string>;
  addAvailability!: HasManyAddAssociationMixin<Availability, string>;
  removeAvailability!: HasManyRemoveAssociationMixin<Availability, string>;
  removeAvailabilities!: HasManyRemoveAssociationsMixin<Availability, string>;
  hasAvailability!: HasManyHasAssociationMixin<Availability, string>;
  hasAvailabilities!: HasManyHasAssociationsMixin<Availability, string>;
  countAvailabilities!: HasManyCountAssociationsMixin;

  // Belongs to many Team
  getTeams!: BelongsToManyGetAssociationsMixin<Team>;
  setTeams!: BelongsToManySetAssociationsMixin<Team, string>;
  addTeams!: BelongsToManyAddAssociationsMixin<Team, string>;
  addTeam!: BelongsToManyAddAssociationMixin<Team, string>;
  removeTeam!: BelongsToManyRemoveAssociationMixin<Team, string>;
  removeTeams!: BelongsToManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: BelongsToManyHasAssociationMixin<Team, string>;
  hasTeams!: BelongsToManyHasAssociationsMixin<Team, string>;
  countTeam!: BelongsToManyCountAssociationsMixin;

  // Belongs to many EventTournament
  getEventTournaments!: BelongsToManyGetAssociationsMixin<EventTournament>;
  setEventTournaments!: BelongsToManySetAssociationsMixin<EventTournament, string>;
  addEventTournaments!: BelongsToManyAddAssociationsMixin<EventTournament, string>;
  addEventTournament!: BelongsToManyAddAssociationMixin<EventTournament, string>;
  removeEventTournament!: BelongsToManyRemoveAssociationMixin<EventTournament, string>;
  removeEventTournaments!: BelongsToManyRemoveAssociationsMixin<EventTournament, string>;
  hasEventTournament!: BelongsToManyHasAssociationMixin<EventTournament, string>;
  hasEventTournaments!: BelongsToManyHasAssociationsMixin<EventTournament, string>;
  countEventTournament!: BelongsToManyCountAssociationsMixin;

  // Has many Court
  getCourts!: HasManyGetAssociationsMixin<Court>;
  setCourts!: HasManySetAssociationsMixin<Court, string>;
  addCourts!: HasManyAddAssociationsMixin<Court, string>;
  addCourt!: HasManyAddAssociationMixin<Court, string>;
  removeCourt!: HasManyRemoveAssociationMixin<Court, string>;
  removeCourts!: HasManyRemoveAssociationsMixin<Court, string>;
  hasCourt!: HasManyHasAssociationMixin<Court, string>;
  hasCourts!: HasManyHasAssociationsMixin<Court, string>;
  countCourts!: HasManyCountAssociationsMixin;

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;
}

@InputType()
export class PointInput {
  @Field(() => Float)
  longitude?: number;

  @Field(() => Float)
  latitude?: number;
}

@InputType()
export class LocationUpdateInput extends PartialType(
  OmitType(Location, ['createdAt', 'updatedAt', 'coordinates'] as const),
  InputType,
) {
  @Field(() => PointInput)
  coordinates?: {
    longitude?: number;
    latitude?: number;
  };
}

@InputType()
export class LocationNewInput extends PartialType(
  OmitType(LocationUpdateInput, ['id'] as const),
  InputType,
) {}
