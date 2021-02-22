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
import { Location, SubEventTournament } from '..';


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

  @HasMany(() => SubEventTournament, 'EventId')
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
}
