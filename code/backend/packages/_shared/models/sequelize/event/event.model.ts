import {
  Column,
  HasMany,
  Model,
  DataType,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { EventType } from '../../enums';
import { Location } from './location.model';
import { SubEvent } from './sub-event.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Event extends Model<Event> {
  @Column
  toernamentNumber: number;

  @Column
  firstDay: Date;

  @Column
  dates: string;

  @Column
  name: string;

  @Column(DataType.ENUM('COMPETITION', 'TOERNAMENT'))
  type: EventType;

  @HasMany(() => SubEvent, 'EventId')
  subEvents: SubEvent[];

  @HasMany(() => Location, 'EventId')
  locations: Location[];

  @Column
  uniCode: string;
}
