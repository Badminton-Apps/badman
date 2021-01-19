import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { SubEvent } from './sub-event.model';
import { GameType } from '../../enums/gameType.enum';
import { Player } from '../player.model';
import { Court } from './court.model';
import { GamePlayer } from './game-player.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Game extends Model<Game> {
  @Column({ unique: 'unique_constraint' })
  playedAt: Date;

  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column
  set1Team1?: number;
  @Column
  set1Team2?: number;
  @Column
  set2Team1?: number;
  @Column
  set2Team2?: number; 
  @Column
  set3Team1?: number;
  @Column
  set3Team2?: number;

  @Column
  winner?: number;

  @BelongsTo(() => SubEvent, 'subEventId')
  subEvent: SubEvent;

  @ForeignKey(() => SubEvent)
  @Column({ unique: 'unique_constraint' })
  subEventId: number;

  @BelongsTo(() => Court, 'courtId')
  court: Court;

  @BelongsToMany(
    () => Player,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { GamePlayer: GamePlayer })[];
}
