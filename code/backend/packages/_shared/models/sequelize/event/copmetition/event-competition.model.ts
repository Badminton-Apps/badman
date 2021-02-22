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

  @HasMany(() => SubEventCompetition, 'EventId')
  subEvents: SubEventCompetition[];

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
}
