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
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as moment from 'moment';

export enum RankingSystems {
  BVL = 'BVL',
  LFBB = 'LFBB',
  ORIGINAL = 'ORIGINAL',
  VISUAL = 'VISUAL',
}

export enum StartingType {
  formula = 'formula',
  tableLFBB = 'tableLFBB',
  tableBVL = 'tableBVL',
}

@Entity({
  name: 'RankingSystems',
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingSystem' })
export class RankingSystem extends BaseEntity {
  constructor() {
    super();

    if (this?.amountOfLevels) {
      this._setupValues();
    }
  }

  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Field(() => String, { nullable: true })
  @Column({ nullable: false, unique: true })
  name?: string;

  @Field(() => Int)
  @Column()
  amountOfLevels!: number;

  @Field(() => Number)
  @Column()
  procentWinning!: number;
  @Field(() => Number)
  @Column()
  procentWinningPlus1!: number;
  @Field(() => Number)
  @Column()
  procentLosing!: number;
  @Field(() => Int, { nullable: true })
  @Column()
  minNumberOfGamesUsedForUpgrade?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  minNumberOfGamesUsedForDowngrade?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  maxDiffLevels?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  maxDiffLevelsHighest?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  latestXGamesToUse?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  maxLevelUpPerChange?: number;
  @Field(() => Int, { nullable: true })
  @Column()
  maxLevelDownPerChange?: number;

  @Field(() => Int, { nullable: true })
  @Column()
  gamesForInactivty?: number;

  @Field(() => Int, { nullable: true })
  @Column()
  inactivityAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'varchar',
  })
  inactivityUnit?: moment.unitOfTime.DurationConstructor;

  @Field(() => String, { nullable: true })
  @Column()
  inactiveBehavior?: 'freeze' | 'decrease';

  get inactivity() {
    return {
      amount: this.inactivityAmount,
      unit: this.inactivityUnit,
    };
  }
  @Field(() => Date, { nullable: true })
  @Column({ nullable: true, default: new Date('2016-08-31T22:00:00.000Z') })
  calculationLastUpdate?: Date;

  @Field(() => Int, { nullable: true })
  @Column()
  calculationDayOfWeek?: number; // SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6

  @Field(() => Int, { nullable: true })
  @Column()
  calculationIntervalAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'varchar',
  })
  calculationIntervalUnit?: moment.unitOfTime.DurationConstructor;

  get calculationInterval() {
    return {
      amount: this.calculationIntervalAmount,
      unit: this.calculationIntervalUnit,
    };
  }

  @Field(() => Int, { nullable: true })
  @Column()
  periodAmount?: number;
  @Field(() => String, { nullable: true })
  @Column({
    type: 'varchar',
  })
  periodUnit?: moment.unitOfTime.DurationConstructor;

  get period() {
    return {
      amount: this.periodAmount,
      unit: this.periodUnit,
    };
  }

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true, default: new Date('2016-08-31T22:00:00.000Z') })
  updateLastUpdate?: Date;

  @Field(() => Int, { nullable: true })
  @Column()
  updateDayOfWeek?: number; // SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6

  @Field(() => Int, { nullable: true })
  @Column()
  updateIntervalAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'varchar',
  })
  updateIntervalUnit?: moment.unitOfTime.DurationConstructor;

  get updateInterval() {
    return {
      amount: this.updateIntervalAmount,
      unit: this.updateIntervalUnit,
    };
  }

  @Field(() => String, { nullable: true })
  @Column()
  rankingSystem?: RankingSystems;

  @Field(() => Boolean, { nullable: false })
  @Column()
  primary!: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column()
  calculateUpdates!: boolean;

  @Field(() => Boolean, { nullable: false })
  @Column()
  runCurrently?: boolean;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForUpgradeSingle?: number;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForUpgradeDouble?: number;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForUpgradeMix?: number;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForDowngradeSingle?: number;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForDowngradeDouble?: number;

  @Field(() => Number, { nullable: true })
  @Column()
  differenceForDowngradeMix?: number;

  @Field(() => String, { nullable: true })
  @Column()
  startingType?: StartingType;

  // @HasMany(() => RankingPoint, 'systemId')
  // rankingPoints?: Relation<RankingPoint>;

  // @HasMany(() => RankingPlace, 'systemId')
  // places?: Relation<RankingPlace>;

  // @HasMany(() => RankingLastPlace, 'systemId')
  // lastPlaces?: Relation<RankingLastPlace>;

  // @BelongsToMany(() => RankingGroup, () => RankingSystemRankingGroupMembership)
  // rankingGroups?: Relation<RankingGroup[]>;


  /**
   * Virtual fields
   */

  private _pointsToGoUp!: number[];
  private _pointsWhenWinningAgainst!: number[];
  private _pointsToGoDown!: number[];

  private _levelArray!: number[];
  private _levelArrayOneMinus!: number[];

  @Field(() => [Int], { nullable: true })
  get pointsToGoUp(): number[] {
    return this._pointsToGoUp;
  }

  @Field(() => [Int], { nullable: true })
  get pointsWhenWinningAgainst(): number[] {
    return this._pointsWhenWinningAgainst;
  }

  @Field(() => [Int], { nullable: true })
  get pointsToGoDown(): number[] {
    return this._pointsToGoDown;
  }

  @Field(() => [Int], { nullable: true })
  get levelArray(): number[] {
    return this._levelArray;
  }
  @Field(() => [Int], { nullable: true })
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
        (this._pointsWhenWinningAgainst[x] * this.procentWinning) / 100,
      );
    });
    this._levelArrayOneMinus.forEach((x) => {
      this._pointsToGoDown[x] = Math.round(
        (this._pointsWhenWinningAgainst[x + 1] * this.procentLosing) / 100,
      );
    });

    this._pointsWhenWinningAgainst = this._pointsWhenWinningAgainst.map((p) =>
      Math.round(p),
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
  InputType,
) {}

@InputType()
export class RankingSystemNewInput extends PartialType(
  OmitType(RankingSystemUpdateInput, ['id'] as const),
  InputType,
) {}
