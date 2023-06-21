import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';

import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
} from 'sequelize';
import { Location } from '../location.model';
import { LocationEventTournamentMembership } from './location-event-membership.model';
import { SubEventTournament } from './sub-event-tournament.model';
import { Slugify } from '../../../types';
import { UsedRankingTiming } from '@badman/utils';
import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { Role } from '../../security';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A EventTournament' })
export class EventTournament extends Model {
  constructor(values?: Partial<EventTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  tournamentNumber: string;

  @Unique('EventTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name: string;

  @Unique('EventTournaments_unique_constraint')
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  firstDay: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  lastSync: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  openDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  closeDate?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  dates: string;

  @BelongsToMany(() => Location, () => LocationEventTournamentMembership)
  locations: Location[];

  @HasMany(() => SubEventTournament, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  subEventTournaments: SubEventTournament[];

  @Unique('EventTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  slug: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  usedRankingAmount: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  usedRankingUnit: 'months' | 'weeks' | 'days';

  get usedRankingg(): UsedRankingTiming {
    return {
      amount: this.usedRankingAmount,
      unit: this.usedRankingUnit,
    };
  }

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  official: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  state: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  country: string;

  @Field(() => [Role], { nullable: true })
  @HasMany(() => Role, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'tournament',
    },
  })
  roles?: Role[];

  regenerateSlug!: Slugify<EventTournament>;

  // Has many subEvent
  getSubEventTournaments!: HasManyGetAssociationsMixin<SubEventTournament>;
  setSubEventTournaments!: HasManySetAssociationsMixin<
    SubEventTournament,
    string
  >;
  addSubEventTournaments!: HasManyAddAssociationsMixin<
    SubEventTournament,
    string
  >;
  addsubEventTournament!: HasManyAddAssociationMixin<
    SubEventTournament,
    string
  >;
  removesubEventTournament!: HasManyRemoveAssociationMixin<
    SubEventTournament,
    string
  >;
  removeSubEventTournaments!: HasManyRemoveAssociationsMixin<
    SubEventTournament,
    string
  >;
  hassubEventTournament!: HasManyHasAssociationMixin<
    SubEventTournament,
    string
  >;
  hasSubEventTournaments!: HasManyHasAssociationsMixin<
    SubEventTournament,
    string
  >;
  countSubEventTournaments!: HasManyCountAssociationsMixin;

  // Belongs to many Location
  getLocations!: BelongsToManyGetAssociationsMixin<Location>;
  setLocations!: BelongsToManySetAssociationsMixin<Location, string>;
  addLocations!: BelongsToManyAddAssociationsMixin<Location, string>;
  addLocation!: BelongsToManyAddAssociationMixin<Location, string>;
  removeLocation!: BelongsToManyRemoveAssociationMixin<Location, string>;
  removeLocations!: BelongsToManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: BelongsToManyHasAssociationMixin<Location, string>;
  hasLocations!: BelongsToManyHasAssociationsMixin<Location, string>;
  countLocation!: BelongsToManyCountAssociationsMixin;

  // Has many Role
  getRoles!: HasManyGetAssociationsMixin<Role>;
  setRoles!: HasManySetAssociationsMixin<Role, string>;
  addRoles!: HasManyAddAssociationsMixin<Role, string>;
  addRole!: HasManyAddAssociationMixin<Role, string>;
  removeRole!: HasManyRemoveAssociationMixin<Role, string>;
  removeRoles!: HasManyRemoveAssociationsMixin<Role, string>;
  hasRole!: HasManyHasAssociationMixin<Role, string>;
  hasRoles!: HasManyHasAssociationsMixin<Role, string>;
  countRoles!: HasManyCountAssociationsMixin;
}

@InputType()
export class EventTournamentUpdateInput extends PartialType(
  OmitType(EventTournament, ['createdAt', 'updatedAt', 'roles'] as const),
  InputType
) {}

@InputType()
export class EventTournamentNewInput extends PartialType(
  OmitType(EventTournamentUpdateInput, ['id'] as const),
  InputType
) {}
