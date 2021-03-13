import { AutoIncrement, Column, ForeignKey, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript';
import { Game } from './game.model';
import { Player } from '../player.model';
import { BuildOptions } from 'sequelize';

@Table({
  timestamps: false,
  schema: 'event'
})
export class GamePlayer extends Model {
  constructor(values?: Partial<GamePlayer>, options?: BuildOptions){
    super(values, options)
  }

  @ForeignKey(() => Player)
  @Column
  playerId: string;

  @ForeignKey(() => Game)
  @Column
  gameId: string;

  @Column
  team: number;

  @Column
  player: number;
}
