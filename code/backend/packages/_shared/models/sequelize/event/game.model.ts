import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType, 
  HasMany,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions
} from 'sequelize-typescript';
import { SubEvent } from './sub-event.model';
import { GameType } from '../../enums';
import { Player } from '../player.model';
import { Court } from './court.model';
import { GamePlayer } from './game-player.model';
import { RankingPoint } from '../ranking';
import { BuildOptions } from 'sequelize';
import { Draw } from './draw.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Game extends Model {
  constructor(values?: Partial<Game>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

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

  @BelongsTo(() => Draw, 'drawId')
  draw: Draw;

  @ForeignKey(() => Draw)
  @Column
  drawId: string;

  @BelongsTo(() => Court, 'courtId')
  court: Court;

  @ForeignKey(() => Court)
  @Column
  courtId: string;

  @BelongsToMany(
    () => Player,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { GamePlayer: GamePlayer })[];
}
