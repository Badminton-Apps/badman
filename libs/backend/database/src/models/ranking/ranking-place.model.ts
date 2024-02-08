import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
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
import { GamePlayerMembership } from '../event';
import { Player } from '../player.model';
import { RankingLastPlace } from './ranking-last-place.model';
import { RankingSystem } from './ranking-system.model';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingPlace' })
export class RankingPlace extends Model {
  constructor(values?: Partial<RankingPlace>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;

  @Unique('unique_constraint')
  @Index({
    name: 'ranking_index',
    using: 'BTREE',
  })
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

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  updatePossible?: boolean;

  @Unique('unique_constraint')
  @ForeignKey(() => Player)
  @Index({
    name: 'ranking_index',
    using: 'BTREE',
  })
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystem)
  @Index({
    name: 'ranking_index',
    using: 'BTREE',
  })
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  systemId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

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

  // #region Hooks

  @AfterUpdate
  static async updateLatestRankingsUpdates(
    instances: RankingPlace[] | RankingPlace,
    options: UpdateOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    await this.updateLatestRankings(instances, options, 'update');
  }

  @BeforeCreate
  @BeforeBulkCreate
  static async addEmptyValues(
    instances: RankingPlace[] | RankingPlace,
    options: SaveOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    for (const instance of instances) {
      // We are missing values
      if (!instance.single || !instance.double || !instance.mix) {
        const prevRankingPlace = await RankingPlace.findOne({
          where: {
            playerId: instance.playerId,
            systemId: instance.systemId,
            rankingDate: {
              [Op.lt]: instance.rankingDate,
            },
          },
          limit: 1,
          order: [['rankingDate', 'DESC']],
          transaction: options?.transaction,
        });

        if (prevRankingPlace) {
          if ((instance.single ?? 0) === 0) {
            instance.single = prevRankingPlace.single;
          }
          if ((instance.double ?? 0) === 0) {
            instance.double = prevRankingPlace.double;
          }
          if ((instance.mix ?? 0) === 0) {
            instance.mix = prevRankingPlace.mix;
          }
        }
      }
    }
  }

  @AfterUpdate
  @AfterBulkUpdate
  static async updateGames(
    instances: RankingPlace[] | RankingPlace,
    options: UpdateOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    await this.updateGameRanking(instances, options);
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
  static async updateLatestRankingsDestroy(
    instances: RankingPlace[] | RankingPlace,
    options: DestroyOptions
  ) {
    if (!Array.isArray(instances)) {
      instances = [instances];
    }

    const currentInstances: RankingPlace[] = [];

    for (const instance of instances) {
      const lastRanking = await RankingPlace.findOne({
        where: {
          playerId: instance.playerId,
          systemId: instance.systemId,
        },
        transaction: options?.transaction,
        limit: 1,
        order: [['rankingDate', 'DESC']],
      });
      if (lastRanking) {
        currentInstances.push(lastRanking);
      }
    }

    await this.updateLatestRankings(currentInstances, options, 'destroy');
  }

  static async updateLatestRankings(
    instances: RankingPlace[],
    options: SaveOptions | UpdateOptions,
    type: 'create' | 'update' | 'destroy'
  ) {
    const rankingLastPlaces = instances.map((r) => r.asLastRankingPlace());
    const whereOr = rankingLastPlaces?.map((r) => {
      if (!r){
        throw new Error(`RankingLastPlace is undefined`);
      } else if (!r.playerId) {
        throw new Error(`RankingLastPlace.playerId is undefined`);
      } else if (!r.systemId) {
        throw new Error(`RankingLastPlace.systemId is undefined`);
      } else if (!r.rankingDate) {
        throw new Error(`RankingLastPlace.rankingDate is undefined`);
      }
     

      const filter: {
        playerId?: string;
        systemId?: string;
        rankingDate?: unknown;
      } = {
        playerId: r.playerId,
        systemId: r.systemId,
        rankingDate: { [Op.lte]: r.rankingDate?.toISOString() },
      };

      return filter;
    });

    // Find where the last ranking place is not the same as the current one
    const current = await RankingLastPlace.findAll({
      where: {
        [Op.or]: whereOr,
      },
      transaction: options.transaction,
    });

    // Filter out if the last ranking is not newer than the current one
    const updateInstances =
      type == 'create'
        ? rankingLastPlaces
        : rankingLastPlaces.filter(
            (l) =>
              current.findIndex(
                (c) => c.playerId === l.playerId && c.systemId === l.systemId
              ) > -1
          );

    // Update the last ranking place
    await RankingLastPlace.bulkCreate(updateInstances, {
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

  static async updateGameRanking(
    instances: RankingPlace[],
    options: UpdateOptions
  ) {
    try {
      for (const instance of instances) {
        // find next ranking place
        const nextRankingPlace = await RankingPlace.findOne({
          where: {
            playerId: instance.playerId,
            systemId: instance.systemId,
            rankingDate: {
              [Op.gt]: instance.rankingDate,
            },
          },
          limit: 1,
          order: [['rankingDate', 'ASC']],
          transaction: options?.transaction,
        });

        const endDate = nextRankingPlace?.rankingDate;
        const dates: { [key: string]: unknown }[] = [
          {
            playedAt: {
              [Op.gte]: instance.rankingDate,
            },
          },
        ];

        if (endDate) {
          dates.push({
            playedAt: {
              [Op.lt]: endDate,
            },
          });
        }

        const p = await instance.getPlayer();
        const games = await p.getGames({
          where: {
            [Op.and]: dates,
          },

          transaction: options?.transaction,
        });

        await GamePlayerMembership.bulkCreate(
          games?.map((g) => {
            return {
              gameId: g.id,
              playerId: p.id,
              systemId: instance.systemId,
              single: instance.single,
              double: instance.double,
              mix: instance.mix,
            };
          }),
          {
            updateOnDuplicate: ['single', 'double', 'mix'],
            transaction: options?.transaction,
          }
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

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
      systemId: this.systemId,
    } as Partial<RankingLastPlace>;
  }
}

@InputType()
export class RankingPlaceUpdateInput extends PartialType(
  OmitType(RankingPlace, [
    'createdAt',
    'updatedAt',
    'player',
    'rankingSystem',
  ] as const),
  InputType
) {}

@InputType()
export class RankingPlaceNewInput extends PartialType(
  OmitType(RankingPlaceUpdateInput, ['id'] as const),
  InputType
) {}
