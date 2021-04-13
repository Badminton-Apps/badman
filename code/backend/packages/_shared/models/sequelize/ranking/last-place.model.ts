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
  Unique
} from 'sequelize-typescript';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import { Player } from '../player.model';
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'LastPlaces',
  schema: 'ranking'
})
export class LastRankingPlace extends Model {
  constructor(values?: Partial<LastRankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  rankingDate: Date;

  @Column
  singlePoints: number;
  @Column
  mixPoints: number;
  @Column
  doublePoints: number;

  @Column
  singlePointsDowngrade: number;
  @Column
  mixPointsDowngrade: number;
  @Column
  doublePointsDowngrade: number;

  @Column
  singleRank: number;
  @Column
  mixRank: number;
  @Column
  doubleRank: number;

  @Column
  totalSingleRanking: number;
  @Column
  totalMixRanking: number;
  @Column
  totalDoubleRanking: number;

  @Column
  totalWithinSingleLevel: number;
  @Column
  totalWithinMixLevel: number;
  @Column
  totalWithinDoubleLevel: number;

  @Column
  single: number;
  @Column
  mix: number;
  @Column
  double: number;

  @Default(false)
  @Column
  singleInactive: boolean;
  @Default(false)
  @Column
  mixInactive: boolean;
  @Default(false)
  @Column
  doubleInactive: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index('ranking_index')
  @Column
  playerId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Column
  systemId: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE'
  })
  rankingSystem: RankingSystem;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;
}
