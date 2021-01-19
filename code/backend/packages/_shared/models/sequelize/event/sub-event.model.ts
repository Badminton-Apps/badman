import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
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
  @Column({ unique: 'unique_constraint' })
  name: string;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('M', 'F', 'MX', 'MINIBAD')
  })
  eventType: SubEventType;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('S', 'D', 'MX')
  })
  gameType: GameType;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('KO', 'POULE', 'QUALIFICATION')
  })
  drawType: DrawType;

  @Column({
    unique: 'unique_constraint',
    type: DataType.ENUM('PROV', 'LIGA', 'NATIONAAL')
  })
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
  @Column({ unique: 'unique_constraint' })
  EventId: number;
}
