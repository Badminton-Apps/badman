import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  DestroyOptions,
  Op,
  SaveOptions,
  UpdateOptions,
} from 'sequelize';
import {
  AfterBulkCreate,
  AfterBulkDestroy,
  AfterBulkUpdate,
  AfterCreate,
  AfterDestroy,
  AfterUpdate,
  BeforeBulkCreate,
  BeforeCreate,
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
import { RankingProcessor } from '../../../processing';
import { Player } from '../player.model';
import { LastRankingPlace } from './last-place.model';
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'Places',
  schema: 'ranking',
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
  gender: string;

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
  playerId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Index('ranking_index')
  @Column
  SystemId: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @BelongsTo(() => RankingSystem, {
    foreignKey: 'SystemId',
    onDelete: 'CASCADE',
  })
  rankingSystem: RankingSystem;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to RankingSystem
  getRankingSystem!: BelongsToGetAssociationMixin<RankingSystem>;
  setRankingSystem!: BelongsToSetAssociationMixin<RankingSystem, string>;

  // #region Hooks

  @AfterUpdate
  @AfterBulkUpdate
  static async updateLatestRankingsUpdates(
    instances: RankingPlace[] | RankingPlace,
    options: UpdateOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    await this.updateLatestRankings(instances, options, 'update');
  }

  @AfterCreate
  @AfterBulkCreate
  static async updateLatestRankingsCreate(
    instances: RankingPlace[] | RankingPlace,
    options: SaveOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }
    await this.updateLatestRankings(instances, options, 'create');
  }

  @AfterDestroy
  @AfterBulkDestroy
  static async updateLatestRankingsDestroy(
    instances: RankingPlace[] | RankingPlace,
    options: DestroyOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    const currentInstances = [];

    for (const instance of instances) {
      const lastRanking = await RankingPlace.findOne({
        where: {
          playerId: instance.playerId,
          SystemId: instance.SystemId,
        },
        transaction: options?.transaction,
        limit: 1,
        order: [['rankingDate', 'DESC']],
      });
      currentInstances.push(lastRanking)
    }

    await this.updateLatestRankings(currentInstances, options, 'destroy');
  }

  static async updateLatestRankings(
    instances: RankingPlace[],
    options: SaveOptions | UpdateOptions,
    type: 'create' | 'update' | 'destroy'
  ) {
    const lastRankingPlaces = instances.map((r) => r.asLastRankingPlace());

    // Find where the last ranking place is not the same as the current one
    const current = await LastRankingPlace.findAll({
      where: {
        [Op.or]: lastRankingPlaces.map((r) => {
          const filter: {
            playerId: string;
            systemId: string;
            rankingDate?: unknown;
          } = {
            playerId: r.playerId,
            systemId: r.systemId,
          };

          if (type === 'create') {
            filter.rankingDate = { [Op.lte]: r.rankingDate };
          } else if (type === 'update') {
            filter.rankingDate = r.rankingDate;
          }

          return filter;
        }),
      },
      transaction: options.transaction,
    });

    // Filter out if the last ranking is not newer than the current one
    const updateInstances = lastRankingPlaces.filter(
      (l) =>
        current.findIndex(
          (c) => c.playerId === l.playerId && c.systemId === l.systemId
        ) > -1
    );

    // Update the last ranking place
    await LastRankingPlace.bulkCreate(updateInstances, {
      updateOnDuplicate: [
        'rankingDate',
        'singlePoints',
        'mixPoints',
        'doublePoints',
        'gender',
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
        'doubleInactive',
      ],
      transaction: options.transaction,
    });
  }

  @BeforeBulkCreate
  static async protectRankings(
    instances: RankingPlace[],
    options: SaveOptions
  ) {
    await RankingProcessor.checkInactive(instances, options);
    await RankingProcessor.protectRanking(instances);
  }

  @BeforeCreate
  static async protectRanking(instance: RankingPlace, options: SaveOptions) {
    await RankingProcessor.checkInactive([instance], options);
    await RankingProcessor.protectRanking([instance])[0];
  }

  // #endregion

  asLastRankingPlace() {
    return {
      rankingDate: this.rankingDate,
      singlePoints: this.singlePoints,
      mixPoints: this.mixPoints,
      gender: this.gender,
      doublePoints: this.doublePoints,
      singlePointsDowngrade: this.singlePointsDowngrade,
      mixPointsDowngrade: this.mixPointsDowngrade,
      doublePointsDowngrade: this.doublePointsDowngrade,
      singleRank: this.singleRank,
      mixRank: this.mixRank,
      doubleRank: this.doubleRank,
      totalSingleRanking: this.totalSingleRanking,
      totalMixRanking: this.totalMixRanking,
      totalDoubleRanking: this.totalDoubleRanking,
      totalWithinSingleLevel: this.totalWithinSingleLevel,
      totalWithinMixLevel: this.totalWithinMixLevel,
      totalWithinDoubleLevel: this.totalWithinDoubleLevel,
      single: this.single,
      mix: this.mix,
      double: this.double,
      singleInactive: this.singleInactive,
      mixInactive: this.mixInactive,
      doubleInactive: this.doubleInactive,
      playerId: this.playerId,
      systemId: this.SystemId,
    } as Partial<LastRankingPlace>;
  }
}
