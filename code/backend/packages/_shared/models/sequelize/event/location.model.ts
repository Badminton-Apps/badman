import { LocationEventTournament } from './tournament/location_event.model';
import { EventCompetition } from '@badvlasim/shared';
import {
  BelongsToGetAssociationMixin,
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
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin
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
  TableOptions
} from 'sequelize-typescript';
import { EventTournament } from '.';
import { Club } from '../../..';
import { LocationEventCompetition } from './competition/location_event.model';
import { Court } from './court.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model {
  constructor(values?: Partial<Location>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  name: string;

  @Column
  address: string;

  @Column
  street: string;

  @Column
  streetNumber: string;

  @Column
  postalcode: number;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  phone: string;

  @Column
  fax: string;

  @BelongsToMany(
    () => EventCompetition,
    () => LocationEventCompetition
  )
  eventCompetitions: EventCompetition[];

  @BelongsToMany(
    () => EventTournament,
    () => LocationEventTournament
  )
  eventTournaments: EventCompetition[];

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsTo(() => Club, 'clubId')
  club: Club;

  @ForeignKey(() => Club)
  @Index
  @Column
  clubId: string;

  // Belongs to many EventCompetition
  getEventCompetitions!: BelongsToManyGetAssociationsMixin<EventCompetition>;
  setEventCompetitions!: BelongsToManySetAssociationsMixin<
    EventCompetition,
    string
  >;
  addEventCompetitions!: BelongsToManyAddAssociationsMixin<
    EventCompetition,
    string
  >;
  addEventCompetition!: BelongsToManyAddAssociationMixin<
    EventCompetition,
    string
  >;
  removeEventCompetition!: BelongsToManyRemoveAssociationMixin<
    EventCompetition,
    string
  >;
  removeEventCompetitions!: BelongsToManyRemoveAssociationsMixin<
    EventCompetition,
    string
  >;
  hasEventCompetition!: BelongsToManyHasAssociationMixin<
    EventCompetition,
    string
  >;
  hasEventCompetitions!: BelongsToManyHasAssociationsMixin<
    EventCompetition,
    string
  >;
  countEventCompetition!: BelongsToManyCountAssociationsMixin;

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
