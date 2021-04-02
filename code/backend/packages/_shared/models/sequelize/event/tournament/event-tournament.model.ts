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
  TableOptions,
  Unique
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
  HasManySetAssociationsMixin
} from 'sequelize';
import { Location } from '../location.model';
import { LocationEventTournament } from './location_event.model';
import { SubEventTournament } from './sub-event-tournament.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class EventTournament extends Model {
  constructor(values?: Partial<EventTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  tournamentNumber: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  firstDay: Date;

  @Column
  dates: string;

  @BelongsToMany(
    () => Location,
    () => LocationEventTournament
  )
  locations: Location[];

  @HasMany(() => SubEventTournament, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE'
  })
  subEvents: SubEventTournament[];

  @BelongsToMany(
    () => Location,
    () => LocationEventTournament
  )
  groups: Location[];

  @Default(false)
  @Column
  allowEnlisting: boolean;

  @Column
  uniCode: string;

  // Has many subEvent
  getSubEvents!: HasManyGetAssociationsMixin<SubEventTournament>;
  setSubEvents!: HasManySetAssociationsMixin<SubEventTournament, string>;
  addSubEvents!: HasManyAddAssociationsMixin<SubEventTournament, string>;
  addsubEvent!: HasManyAddAssociationMixin<SubEventTournament, string>;
  removesubEvent!: HasManyRemoveAssociationMixin<SubEventTournament, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<SubEventTournament, string>;
  hassubEvent!: HasManyHasAssociationMixin<SubEventTournament, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<SubEventTournament, string>;
  countSubEvents!: HasManyCountAssociationsMixin;

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
}
