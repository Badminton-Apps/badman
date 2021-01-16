import {
  BelongsTo,
  Column,
  HasMany,
  Model,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { Court } from './court.model';
import { Event } from './event.model';
 
@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Location extends Model<Location> {
  @Column
  name: string;
 
  @HasMany(() => Court, 'locationId')
  courts: Court;
  
  @BelongsTo(() => Event, 'eventId')
  event: Event;

  @Column
  uniCode: string;
}
