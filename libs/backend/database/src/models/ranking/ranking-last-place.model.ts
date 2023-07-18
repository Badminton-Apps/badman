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
  Unique,
} from 'sequelize-typescript';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingLastPlace' })
export class RankingLastPlace extends Model {
  constructor(values?: Partial<RankingLastPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  rankingDate?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  gender?: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singlePoints?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixPoints?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doublePoints?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singlePointsDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixPointsDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doublePointsDowngrade?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  singleRank?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mixRank?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  doubleRank?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalSingleRanking?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalMixRanking?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalDoubleRanking?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinSingleLevel?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinMixLevel?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  totalWithinDoubleLevel?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  single?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  mix?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  double?: number;

  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  singleInactive?: boolean;
  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  mixInactive?: boolean;
  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  doubleInactive?: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index('lastPlaces_ranking_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Index('lastPlaces_ranking_index')
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  systemId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @Field(() => RankingSystem, { nullable: true })
  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE',
  })
  rankingSystem?: Relation<RankingSystem>;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;
}

@ObjectType()
export class PagedRankingLastPlaces {
  @Field(() => Int)
  count?: number;

  @Field(() => [RankingLastPlace])
  rows?: Relation<RankingLastPlace[]>;
}
