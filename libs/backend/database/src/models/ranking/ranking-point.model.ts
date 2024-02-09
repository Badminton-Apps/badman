import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Game } from '../event';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingPoint' })
export class RankingPoint extends Model {
  constructor(values?: Partial<RankingPoint>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;
  
  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  points?: number;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @Field(() => Game, { nullable: true })
  @BelongsTo(() => Game, 'gameId')
  game?: Relation<Game>;

  @Field(() => RankingSystem, { nullable: true })
  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE',
  })
  system?: Relation<RankingSystem>;

  @ForeignKey(() => RankingSystem)
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  rankingDate?: Date;

  @Field(() => Number, { nullable: true })
  @Column(DataType.DECIMAL)
  differenceInLevel?: number;

  @ForeignKey(() => RankingSystem)
  @Index('point_system_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  systemId?: string;

  @ForeignKey(() => Player)
  @Index('point_system_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @ForeignKey(() => Game)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  gameId?: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Game
  getGame!: BelongsToGetAssociationMixin<Game>;
  setGame!: BelongsToSetAssociationMixin<Game, string>;

  // Belongs to System
  getSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;
}
