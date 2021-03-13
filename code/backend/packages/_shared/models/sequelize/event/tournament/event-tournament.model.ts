import {
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
import { Location, SubEventTournament } from '..';

import {
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

  @HasMany(() => SubEventTournament, 'eventId')
  subEvents: SubEventTournament[];

  @HasMany(() => Location, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      drawType: 'Tournament'
    }
  })
  locations: Location[];

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

  // Has many Location
  getLocations!: HasManyGetAssociationsMixin<Location>;
  setLocations!: HasManySetAssociationsMixin<Location, string>;
  addLocations!: HasManyAddAssociationsMixin<Location, string>;
  addLocation!: HasManyAddAssociationMixin<Location, string>;
  removeLocation!: HasManyRemoveAssociationMixin<Location, string>;
  removeLocations!: HasManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: HasManyHasAssociationMixin<Location, string>;
  hasLocations!: HasManyHasAssociationsMixin<Location, string>;
  countLocations!: HasManyCountAssociationsMixin;
}
