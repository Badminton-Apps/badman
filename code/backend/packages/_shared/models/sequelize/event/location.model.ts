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
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import { EventCompetition, EventTournament } from '.';
import { Club } from '../../..';
import { ClubLocation } from '../club-location.model';
import { Court } from './court.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Column
  address: string;

  @Column
  postalcode: string;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  phone: string;

  @Column
  fax: string;

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsTo(() => EventTournament, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      eventType: 'tournament'
    }
  })
  eventTournament: EventTournament;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      eventType: 'competition'
    }
  })
  eventCompetition: EventCompetition;

  @Unique('unique_constraint')
  @Column
  eventId: string;

  @Unique('unique_constraint')
  @Column
  eventType: string;
  @BelongsToMany(
    () => Club,
    () => ClubLocation
  )
  clubs: Club[];

  // Belongs to EventTournament
  getEventTournament!: BelongsToGetAssociationMixin<EventTournament>;
  setEventTournament!: BelongsToSetAssociationMixin<EventTournament, string>;

  // Belongs to EventCompetition
  getEventCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setEventCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;

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

  // Belongs to many Club
  getClubs!: BelongsToManyGetAssociationsMixin<Club>;
  setClub!: BelongsToManySetAssociationsMixin<Club, string>;
  addClubs!: BelongsToManyAddAssociationsMixin<Club, string>;
  addClub!: BelongsToManyAddAssociationMixin<Club, string>;
  removeClub!: BelongsToManyRemoveAssociationMixin<Club, string>;
  removeClubs!: BelongsToManyRemoveAssociationsMixin<Club, string>;
  hasClub!: BelongsToManyHasAssociationMixin<Club, string>;
  hasClubs!: BelongsToManyHasAssociationsMixin<Club, string>;
  countClub!: BelongsToManyCountAssociationsMixin;
}
