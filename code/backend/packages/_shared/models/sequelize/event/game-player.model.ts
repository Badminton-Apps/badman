import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Game } from './game.model';
import { Player } from '../player.model';

@Table({
    timestamps: false,
    schema: "event"
})
export class GamePlayer extends Model<GamePlayer> {
  @ForeignKey(() => Player)
  @Column({ unique: 'unique_constraint' })
  playerId: number;

  @ForeignKey(() => Game)
  @Column({ unique: 'unique_constraint' })
  gameId: number;

  @Column
  team: number;

  @Column
  player: number;
}
