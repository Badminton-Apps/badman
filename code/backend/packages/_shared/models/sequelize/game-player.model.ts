import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Game } from './game.model';
import { Player } from './player.model';

@Table({
    timestamps: false,
    schema: "public"
})
export class GamePlayer extends Model<GamePlayer> {
  @ForeignKey(() => Player)
  @Column
  playerId: number;

  @ForeignKey(() => Game)
  @Column
  gameId: number;

  @Column
  team: number;

  @Column
  player: number;
}
