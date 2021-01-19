import {
  BelongsTo,
  Column,
  ForeignKey,
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
  @Column({ unique: 'unique_constraint' })
  name: string;
 
  @HasMany(() => Court, 'locationId')
  courts: Court;
  
  @BelongsTo(() => Event, 'eventId')
  event: Event;

  @ForeignKey(() => Event)
  @Column({ unique: 'unique_constraint' })
  eventId: number;
}
