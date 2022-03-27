import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { Location } from './location.model';

@Table({
  timestamps: true,
  schema: 'event',
  tableName: 'Availabilities',
} as TableOptions)
export class Availability extends Model {
  constructor(values?: Partial<Availability>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  year: number;

  @Column({
    type: DataType.JSON,
  })
  days: AvailiblyDay[];

  @Column({
    type: DataType.JSON,
  })
  exceptions: AvailabilityException[];

  @BelongsTo(() => Location, {
    foreignKey: 'locationId',
    constraints: false,
  })
  location: Location;

  @ForeignKey(() => Location)
  @Column
  locationId: string;

  // Belongs to Location
  getLocation!: BelongsToGetAssociationMixin<Location>;
  setLocation!: BelongsToSetAssociationMixin<Location, string>;
}

export interface AvailabilityException {
  start: Date;
  end: Date;
  courts: number;
}

export interface AvailiblyDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  courts: number;
}
