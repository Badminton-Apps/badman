import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { DrawType, GameType, LevelType, SubEventType } from '../../enums';
import { Event } from './event.model';
import { Game } from './game.model';
import { GroupSubEvents, RankingSystemGroup } from '../ranking';
import { Team } from '../team.model';
import { BuildOptions } from 'sequelize/types';
import { Draw } from './draw.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEvent extends Model {
  constructor(values?: Partial<SubEvent>, options?: BuildOptions){
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
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(
    () => RankingSystemGroup,
    () => GroupSubEvents
  )
  groups: RankingSystemGroup[];

  @HasMany(() => Team, 'SubEventId')
  teams: Team[];

  @HasMany(() => Draw, 'SubEventId')
  draws: Draw[];

  @BelongsTo(() => Event, 'EventId')
  event?: Event;

  @Unique('unique_constraint')
  @ForeignKey(() => Event)
  @Column
  EventId: string;
}
