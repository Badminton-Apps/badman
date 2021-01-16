import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  Model,
  Table
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
  @Column
  name: string;

  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  drawType: DrawType;

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
}
