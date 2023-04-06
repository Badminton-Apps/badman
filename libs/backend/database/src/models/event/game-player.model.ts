import { Field, ObjectType } from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import {
  Column,
  ForeignKey,
  Index,
  Model,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { Player } from '../player.model';
import { RankingSystem } from '../ranking';
import { Game } from './game.model';

@Table({
  timestamps: false,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A GamePlayer' })
export class GamePlayerMembership extends Model {
  constructor(values?: Partial<GamePlayerMembership>, options?: BuildOptions) {
    super(values, options);
  }

  @Field({ nullable: true })
  @ForeignKey(() => Player)
  @Index
  @Column
  playerId: string;

  @Field({ nullable: true })
  @ForeignKey(() => Game)
  @Index
  @Column
  gameId: string;

  @Field({ nullable: true })
  @ForeignKey(() => RankingSystem)
  @Index
  @Column
  systemId: string;

  @Field({ nullable: true })
  @Column
  team: number;

  @Field({ nullable: true })
  @Column
  player: number;

  @Field({ nullable: true })
  @Column
  single: number;

  @Field({ nullable: true })
  @Column
  double: number;

  @Field({ nullable: true })
  @Column
  mix: number;
}
