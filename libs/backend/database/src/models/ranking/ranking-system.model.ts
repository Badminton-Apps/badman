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
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
} from 'sequelize';
import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { RankingSystems, RankingTiming, StartingType } from '@badman/utils';
import { RankingGroup } from './ranking-group.model';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { RankingLastPlace } from './ranking-last-place.model';
import { RankingPlace } from './ranking-place.model';
import { RankingPoint } from './ranking-point.model';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingSystem' })
export class RankingSystem extends Model {
  constructor(values?: Partial<RankingSystem>, options?: BuildOptions) {
    super(values, options);

    if (values?.amountOfLevels) {
      this._setupValues();
    }
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Unique
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Field(() => Int)
  @Column(DataType.NUMBER)
  amountOfLevels!: number;

  @Field(() => Int)
  @Column(DataType.NUMBER)
  procentWinning!: number;
  @Field(() => Int)
  @Column(DataType.NUMBER)
  procentWinningPlus1!: number;
  @Field(() => Int)
  @Column(DataType.NUMBER)
  procentLosing!: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  minNumberOfGamesUsedForUpgrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  minNumberOfGamesUsedForDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxDiffLevels?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxDiffLevelsHighest?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  latestXGamesToUse?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxLevelUpPerChange?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxLevelDownPerChange?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  gamesForInactivty?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  inactivityAmount?: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  inactivityUnit?: 'months' | 'weeks' | 'days';

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('freeze', 'decrease'))
  inactiveBehavior?: 'freeze' | 'decrease';

  get inactivity(): RankingTiming {
    return {
      amount: this.inactivityAmount,
      unit: this.inactivityUnit,
    };
  }
  @Default(new Date('2016-08-31T22:00:00.000Z'))
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  caluclationIntervalLastUpdate?: Date;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  caluclationIntervalAmount?: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  calculationIntervalUnit?: 'months' | 'weeks' | 'days';

  get calculationInterval(): RankingTiming {
    return {
      amount: this.caluclationIntervalAmount,
      unit: this.calculationIntervalUnit,
    };
  }

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  periodAmount?: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  periodUnit?: 'months' | 'weeks' | 'days';

  get period(): RankingTiming {
    return {
      amount: this.periodAmount,
      unit: this.periodUnit,
    };
  }
  @Default(new Date('2016-08-31T22:00:00.000Z'))
  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  updateIntervalAmountLastUpdate?: Date;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  updateIntervalAmount?: number;
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  updateIntervalUnit?: 'months' | 'weeks' | 'days';

  get updateInterval(): RankingTiming {
    return {
      amount: this.updateIntervalAmount,
      unit: this.updateIntervalUnit,
    };
  }

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('BVL', 'ORIGINAL', 'LFBB', 'VISUAL'))
  rankingSystem?: RankingSystems;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  primary?: boolean;

  @Field(() => Boolean, { nullable: true })
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  runCurrently?: boolean;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  runDate?: Date;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 1 })
  differenceForUpgradeSingle?: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 1 })
  differenceForUpgradeDouble?: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 1 })
  differenceForUpgradeMix?: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 0 })
  differenceForDowngradeSingle?: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 0 })
  differenceForDowngradeDouble?: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: DataType.NUMBER, defaultValue: 0 })
  differenceForDowngradeMix?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.ENUM('formula', 'tableLFBB', 'tableBVL'),
    defaultValue: 'formula',
  })
  startingType?: StartingType;

  @HasMany(() => RankingPoint, 'systemId')
  rankingPoints?: Relation<RankingPoint>;

  @HasMany(() => RankingPlace, 'systemId')
  places?: Relation<RankingPlace>;

  @HasMany(() => RankingLastPlace, 'systemId')
  lastPlaces?: Relation<RankingLastPlace>;

  @BelongsToMany(() => RankingGroup, () => RankingSystemRankingGroupMembership)
  rankingGroups?: Relation<RankingGroup[]>;

  // Has many RankingPoint
  getRankingPoints!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPoints!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoint!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoint!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoint!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPoints!: HasManyCountAssociationsMixin;

  // Has many RankingPlace
  getRankingPlaces!: HasManyGetAssociationsMixin<RankingPlace>;
  setRankingPlaces!: HasManySetAssociationsMixin<RankingPlace, string>;
  addRankingPlaces!: HasManyAddAssociationsMixin<RankingPlace, string>;
  addRankingPlace!: HasManyAddAssociationMixin<RankingPlace, string>;
  removeRankingPlace!: HasManyRemoveAssociationMixin<RankingPlace, string>;
  removeRankingPlaces!: HasManyRemoveAssociationsMixin<RankingPlace, string>;
  hasRankingPlace!: HasManyHasAssociationMixin<RankingPlace, string>;
  hasRankingPlaces!: HasManyHasAssociationsMixin<RankingPlace, string>;
  countRankingPlaces!: HasManyCountAssociationsMixin;

  // Belongs to many Group
  getRankingGroups!: BelongsToManyGetAssociationsMixin<RankingGroup>;
  setRankingGroups!: BelongsToManySetAssociationsMixin<RankingGroup, string>;
  addRankingGroups!: BelongsToManyAddAssociationsMixin<RankingGroup, string>;
  addRankingGroup!: BelongsToManyAddAssociationMixin<RankingGroup, string>;
  removeRankingGroup!: BelongsToManyRemoveAssociationMixin<
    RankingGroup,
    string
  >;
  removeRankingGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingGroup,
    string
  >;
  hasRankingGroup!: BelongsToManyHasAssociationMixin<RankingGroup, string>;
  hasRankingGroups!: BelongsToManyHasAssociationsMixin<RankingGroup, string>;
  countRankingGroup!: BelongsToManyCountAssociationsMixin;

  // Has many LastPlace
  getLastPlaces!: HasManyGetAssociationsMixin<RankingLastPlace>;
  setLastPlaces!: HasManySetAssociationsMixin<RankingLastPlace, string>;
  addLastPlaces!: HasManyAddAssociationsMixin<RankingLastPlace, string>;
  addLastPlace!: HasManyAddAssociationMixin<RankingLastPlace, string>;
  removeLastPlace!: HasManyRemoveAssociationMixin<RankingLastPlace, string>;
  removeLastPlaces!: HasManyRemoveAssociationsMixin<RankingLastPlace, string>;
  hasLastPlace!: HasManyHasAssociationMixin<RankingLastPlace, string>;
  hasLastPlaces!: HasManyHasAssociationsMixin<RankingLastPlace, string>;
  countLastPlaces!: HasManyCountAssociationsMixin;

  private _pointsToGoUp!: number[];
  private _pointsWhenWinningAgainst!: number[];
  private _pointsToGoDown!: number[];

  private _levelArray!: number[];
  private _levelArrayOneMinus!: number[];

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsToGoUp(): number[] {
    return this._pointsToGoUp;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsWhenWinningAgainst(): number[] {
    return this._pointsWhenWinningAgainst;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get pointsToGoDown(): number[] {
    return this._pointsToGoDown;
  }

  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get levelArray(): number[] {
    return this._levelArray;
  }
  @Field(() => [Int], { nullable: true })
  @Column(DataType.VIRTUAL)
  get levelArrayOneMinus(): number[] {
    return this._levelArrayOneMinus;
  }

  private _setupValues() {
    this._levelArray = Array(this.amountOfLevels)
      .fill(0)
      .map((v, i) => i);
    this._levelArrayOneMinus = Array(this.amountOfLevels - 1)
      .fill(0)
      .map((v, i) => i);

    switch (this.rankingSystem) {
      case RankingSystems.BVL:
      case RankingSystems.VISUAL:
        this._bvlCaps();
        break;
      case RankingSystems.LFBB:
        this._lfbbCaps();
        break;
      case RankingSystems.ORIGINAL:
        this._originalCaps();
        break;
    }
  }

  private _bvlCaps() {
    this._pointsToGoUp = [];
    this._pointsWhenWinningAgainst = [];
    this._pointsToGoDown = [];

    this._levelArray?.forEach((x) => {
      if (x === 0) {
        this._pointsWhenWinningAgainst[x] = 50;
      } else {
        this._pointsWhenWinningAgainst[x] =
          (this._pointsWhenWinningAgainst[x - 1] * this.procentWinning) /
          this.procentWinningPlus1;
      }
    });

    this._levelArrayOneMinus.forEach((x) => {
      this._pointsToGoUp[x] = Math.round(
        (this._pointsWhenWinningAgainst[x] * this.procentWinning) / 100
      );
    });
    this._levelArrayOneMinus.forEach((x) => {
      this._pointsToGoDown[x] = Math.round(
        (this._pointsWhenWinningAgainst[x + 1] * this.procentLosing) / 100
      );
    });

    this._pointsWhenWinningAgainst = this._pointsWhenWinningAgainst.map((p) =>
      Math.round(p)
    );
  }

  private _lfbbCaps() {
    this._pointsWhenWinningAgainst = [
      10, 30, 45, 60, 75, 120, 165, 210, 255, 390, 525, 660, 795, 1200, 1605,
      2010, 2415,
    ];
    this._pointsToGoUp = [
      5, 20, 31, 38, 61, 83, 106, 128, 196, 263, 331, 398, 601, 803, 1006, 1208,
    ];
    this._pointsToGoDown = this._pointsToGoUp;
  }
  private _originalCaps() {
    throw new Error('Not implementd');
  }
}

@InputType()
export class RankingSystemUpdateInput extends PartialType(
  OmitType(RankingSystem, ['createdAt', 'updatedAt'] as const),
  InputType
) {}

@InputType()
export class RankingSystemNewInput extends PartialType(
  OmitType(RankingSystemUpdateInput, ['id'] as const),
  InputType
) {}
