import { BelongsTo, BelongsToMany, Column, DataType, Model, Table, ForeignKey } from 'sequelize-typescript';
import { GameType } from '../enums/gameType.enum';
import { GamePlayer } from './game-player.model';
import { Player } from './player.model';
import { SubEvent } from './sub-event.model';

@Table({
  timestamps: true,
  schema: "public"
})
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

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvent: SubEvent;

  @BelongsToMany(
    () => Player,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  players: (Player & { GamePlayer: GamePlayer })[];
}
