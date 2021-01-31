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

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEvent extends Model<SubEvent> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Index
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  drawType: DrawType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Column
  size: number;

  @Column
  internalId: number;

  @BelongsToMany(
    () => RankingSystemGroup,
    () => GroupSubEvents
  )
  groups: RankingSystemGroup[];

  @HasMany(() => Game, 'subEventId')
  games: Game[];

  @HasMany(() => Team, 'SubEventId')
  teams: Team[];

  @BelongsTo(() => Event, 'EventId')
  event?: Event;

  @ForeignKey(() => Event)
  @Column
  EventId: string;
}
