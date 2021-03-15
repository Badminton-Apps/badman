import {
  Column,
  HasMany,
  Model,
  DataType,
  Table,
  TableOptions,
  PrimaryKey,
  Unique,
  IsUUID,
  Default
} from 'sequelize-typescript';
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
} from 'sequelize/types';
import { Location } from '../location.model';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class EventCompetition extends Model {
  constructor(values?: Partial<EventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  startYear: number;

  @HasMany(() => SubEventCompetition, 'eventId')
  subEvents: SubEventCompetition[];

  @HasMany(() => Location, {
    foreignKey: 'eventId',
    constraints: false,
    scope: {
      drawType: 'competition' 
    }
  })
  locations: Location[];

  @Column
  uniCode: string;

  @Default(false)
  @Column
  allowEnlisting: boolean;

  // Has many SubEvent
  getSubEvents!: HasManyGetAssociationsMixin<SubEventCompetition>;
  setSubEvents!: HasManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEvents!: HasManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEvent!: HasManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEvent!: HasManyRemoveAssociationMixin<SubEventCompetition, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<SubEventCompetition, string>;
  hasSubEvent!: HasManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<SubEventCompetition, string>;
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
