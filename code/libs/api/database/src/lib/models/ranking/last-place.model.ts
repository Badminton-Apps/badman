import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'LastPlaces',
  schema: 'ranking',
})
@ObjectType({ description: 'A LastRankingPlace' })
export class LastRankingPlace extends Model {
  constructor(values?: Partial<LastRankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID, { nullable: true })
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  rankingDate: Date;

  @Field({ nullable: true })
  @Column
  gender: string;

  @Field({ nullable: true })
  @Column
  singlePoints: number;
  @Field({ nullable: true })
  @Column
  mixPoints: number;
  @Field({ nullable: true })
  @Column
  doublePoints: number;

  @Field({ nullable: true })
  @Column
  singlePointsDowngrade: number;
  @Field({ nullable: true })
  @Column
  mixPointsDowngrade: number;
  @Field({ nullable: true })
  @Column
  doublePointsDowngrade: number;

  @Field({ nullable: true })
  @Column
  singleRank: number;
  @Field({ nullable: true })
  @Column
  mixRank: number;
  @Field({ nullable: true })
  @Column
  doubleRank: number;

  @Field({ nullable: true })
  @Column
  totalSingleRanking: number;
  @Field({ nullable: true })
  @Column
  totalMixRanking: number;
  @Field({ nullable: true })
  @Column
  totalDoubleRanking: number;

  @Field({ nullable: true })
  @Column
  totalWithinSingleLevel: number;
  @Field({ nullable: true })
  @Column
  totalWithinMixLevel: number;
  @Field({ nullable: true })
  @Column
  totalWithinDoubleLevel: number;

  @Field({ nullable: true })
  @Column
  single: number;
  @Field({ nullable: true })
  @Column
  mix: number;
  @Field({ nullable: true })
  @Column
  double: number;

  @Default(false)
  @Field({ nullable: true })
  @Column
  singleInactive: boolean;
  @Default(false)
  @Field({ nullable: true })
  @Column
  mixInactive: boolean;
  @Default(false)
  @Field({ nullable: true })
  @Column
  doubleInactive: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index('lastPlaces_ranking_index')
  @Field({ nullable: true })
  @Column
  playerId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Index('lastPlaces_ranking_index')
  @Field({ nullable: true })
  @Column
  systemId: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @Field(() => RankingSystem, { nullable: true })
  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE',
  })
  rankingSystem: RankingSystem;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;
}
