import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { Club } from '../club.model';
import { Team } from '../team.model';
import { Availability } from './availability.model';
import { TeamLocationCompetition } from './competition/team-location-membership.model';
import { Court } from './court.model';
import { EventTournament } from './tournament';
import { LocationEventTournamentMembership } from './tournament/location-event-membership.model';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A Location' })
export class Location extends Model {
  constructor(values?: Partial<Location>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  name: string;

  @Field({ nullable: true })
  @Column
  address: string;

  @Field({ nullable: true })
  @Column
  street: string;

  @Field({ nullable: true })
  @Column
  streetNumber: string;

  @Field({ nullable: true })
  @Column
  postalcode: string;

  @Field({ nullable: true })
  @Column
  city: string;

  @Field({ nullable: true })
  @Column
  state: string;

  @Field({ nullable: true })
  @Column
  phone: string;

  @Field({ nullable: true })
  @Column
  fax: string;

  @BelongsToMany(() => Team, () => TeamLocationCompetition)
  teams: Team[];

  @BelongsToMany(() => EventTournament, () => LocationEventTournamentMembership)
  eventTournaments: EventTournament[];

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsTo(() => Club, 'clubId')
  club: Club;

  @ForeignKey(() => Club)
  @Index
  @Field({ nullable: true })
  @Column
  clubId: string;

  @HasMany(() => Availability)
  availabilities: Availability[];

  // Has many Availibilty
  getAvailibilties!: HasManyGetAssociationsMixin<Availability>;
  setAvailibilties!: HasManySetAssociationsMixin<Availability, string>;
  addAvailibilties!: HasManyAddAssociationsMixin<Availability, string>;
  addAvailibilty!: HasManyAddAssociationMixin<Availability, string>;
  removeAvailibilty!: HasManyRemoveAssociationMixin<Availability, string>;
  removeAvailibilties!: HasManyRemoveAssociationsMixin<Availability, string>;
  hasAvailibilty!: HasManyHasAssociationMixin<Availability, string>;
  hasAvailibilties!: HasManyHasAssociationsMixin<Availability, string>;
  countAvailibilties!: HasManyCountAssociationsMixin;

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
  setEventTournaments!: BelongsToManySetAssociationsMixin<
    EventTournament,
    string
  >;
  addEventTournaments!: BelongsToManyAddAssociationsMixin<
    EventTournament,
    string
  >;
  addEventTournament!: BelongsToManyAddAssociationMixin<
    EventTournament,
    string
  >;
  removeEventTournament!: BelongsToManyRemoveAssociationMixin<
    EventTournament,
    string
  >;
  removeEventTournaments!: BelongsToManyRemoveAssociationsMixin<
    EventTournament,
    string
  >;
  hasEventTournament!: BelongsToManyHasAssociationMixin<
    EventTournament,
    string
  >;
  hasEventTournaments!: BelongsToManyHasAssociationsMixin<
    EventTournament,
    string
  >;
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
