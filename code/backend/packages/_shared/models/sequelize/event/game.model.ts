import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType, HasMany,
  Model,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { SubEvent } from './sub-event.model';
import { GameType } from '../../enums';
import { Player } from '../player.model';
import { Court } from './court.model';
import { GamePlayer } from './game-player.model';
import { RankingPoint } from '../ranking';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Game extends Model<Game> {
  @Column
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

  @HasMany(() => RankingPoint, 'GameId')
  rankingPoints?: RankingPoint[];

  @BelongsTo(() => SubEvent, 'subEventId')
  subEvent: SubEvent;

  @BelongsTo(() => Court, 'courtId')
  court: Court;

  @BelongsToMany(
    () => Player,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { GamePlayer: GamePlayer })[];
}
