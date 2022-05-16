import { Field } from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import { Column, ForeignKey, Index, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Game } from './game.model';

@Table({
  timestamps: false,
  schema: 'event',
})
export class GamePlayer extends Model {
  constructor(values?: Partial<GamePlayer>, options?: BuildOptions) {
    super(values, options);
  }

  @ForeignKey(() => Player)
  @Index
  @Field({ nullable: true })
  @Column
  playerId: string;

  @ForeignKey(() => Game)
  @Index
  @Field({ nullable: true })
  @Column
  gameId: string;

  @Field({ nullable: true })
  @Column
  team: number;

  @Field({ nullable: true })
  @Column
  player: number;
}