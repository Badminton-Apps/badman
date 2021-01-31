import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import { Court } from './court.model';
import { Event } from './event.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model<Location> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @HasMany(() => Court, 'locationId')
  courts: Court;

  @BelongsTo(() => Event, 'eventId')
  event: Event;

  @ForeignKey(() => Event)
  @Unique('unique_constraint')
  @Column
  eventId: string;
}
