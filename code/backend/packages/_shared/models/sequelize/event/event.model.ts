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
import { BuildOptions } from 'sequelize/types';
import { EventType } from '../../enums';
import { TypedModel } from '../model';
import { Location } from './location.model';
import { SubEvent } from './sub-event.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Event extends Model {
  constructor(values?: Partial<Event>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  toernamentNumber: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  firstDay: Date;

  @Column
  dates: string;

  @Column(DataType.ENUM('COMPETITION', 'TOERNAMENT'))
  type: EventType;

  @HasMany(() => SubEvent, 'EventId')
  subEvents: SubEvent[];

  @HasMany(() => Location, 'eventId')
  locations: Location[];

  @Column
  uniCode: string;
}
