import {
  AfterBulkCreate,
  AfterCreate,
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
  BuildOptions,
  SaveOptions
} from 'sequelize';
import { Player } from '../player.model';
import { RankingSystem } from './system.model';
import { LastRankingPlace } from './last-place.model';
import { logger } from '../../..';

@Table({
  timestamps: true,
  tableName: 'Places',
  schema: 'ranking'
})
export class RankingPlace extends Model {
  constructor(values?: Partial<RankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
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

  @Column
  updatePossible: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index('ranking_index')
  @Column
  PlayerId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Index('ranking_index')
  @Column
  SystemId: string;

  @BelongsTo(() => Player, 'PlayerId')
  player: Player;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'SystemId',
    onDelete: 'CASCADE'
  })
  rankingSystem: RankingSystem;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;

  // #region Hooks

  @AfterBulkCreate
  static async updateLatestRankings(
    instances: RankingPlace[],
    options: SaveOptions
  ) {
    const updateInstances = instances.map(r => {
      return {
        rankingDate: r.rankingDate,
        singlePoints: r.singlePoints,
        mixPoints: r.mixPoints,
        doublePoints: r.doublePoints,
        singlePointsDowngrade: r.singlePointsDowngrade,
        mixPointsDowngrade: r.mixPointsDowngrade,
        doublePointsDowngrade: r.doublePointsDowngrade,
        singleRank: r.singleRank,
        mixRank: r.mixRank,
        doubleRank: r.doubleRank,
        totalSingleRanking: r.totalSingleRanking,
        totalMixRanking: r.totalMixRanking,
        totalDoubleRanking: r.totalDoubleRanking,
        totalWithinSingleLevel: r.totalWithinSingleLevel,
        totalWithinMixLevel: r.totalWithinMixLevel,
        totalWithinDoubleLevel: r.totalWithinDoubleLevel,
        single: r.single,
        mix: r.mix,
        double: r.double,
        singleInactive: r.singleInactive,
        mixInactive: r.mixInactive,
        doubleInactive: r.doubleInactive,
        playerId: r.PlayerId,
        systemId: r.SystemId
      } as const;
    });

    await LastRankingPlace.bulkCreate(updateInstances, {
      updateOnDuplicate: [
        'rankingDate',
        'singlePoints',
        'mixPoints',
        'doublePoints',
        'singlePointsDowngrade',
        'mixPointsDowngrade',
        'doublePointsDowngrade',
        'singleRank',
        'mixRank',
        'doubleRank',
        'totalSingleRanking',
        'totalMixRanking',
        'totalDoubleRanking',
        'totalWithinSingleLevel',
        'totalWithinMixLevel',
        'totalWithinDoubleLevel',
        'single',
        'mix',
        'double',
        'singleInactive',
        'mixInactive',
        'doubleInactive'
      ],
      transaction: options.transaction
    });
  }

  @AfterCreate
  static async updateLatestRanking(
    instance: RankingPlace,
    options: SaveOptions
  ) {
    logger.debug('This is called?');
    return this.updateLatestRankings([instance], options);
  }

  // #endregion
}
