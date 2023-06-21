import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import {
  Column,
  DataType,
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

  @Field(() => ID, { nullable: true })
  @ForeignKey(() => Player)
  @Index
  @Column(DataType.UUIDV4)
  playerId: string;

  @Field(() => ID, { nullable: true })
  @ForeignKey(() => Game)
  @Index
  @Column(DataType.UUIDV4)
  gameId: string;

  @Field(() => ID, { nullable: true })
  @ForeignKey(() => RankingSystem)
  @Index
  @Column(DataType.UUIDV4)
  systemId: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  team: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  player: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  single: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  double: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mix: number;
}
