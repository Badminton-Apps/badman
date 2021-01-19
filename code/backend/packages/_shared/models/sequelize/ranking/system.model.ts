import {
  Column,
  HasMany,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany
} from 'sequelize-typescript';
import { BelongsToManyGetAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions } from 'sequelize/types';
import { RankingPoint } from './point.model';
import { Player } from '../player.model';
import { RankingTiming, RankingSystems, StartingType } from '../../enums/';
import { RankingSystemGroup } from './group.model';
import { GroupSystems } from './group_system.model';

@Table({
  timestamps: true,
  tableName: 'Systems',
  schema: 'ranking'
})
export class RankingSystem extends Model<RankingSystem> {
  constructor(values?: Partial<RankingSystem>, options?: BuildOptions) {
    super(values, options);
    this._setupValues();
  }

  @Column({ unique: 'unique_constraint' })
  name: string;

  @Column
  amountOfLevels: number;

  @Column
  procentWinning: number;
  @Column
  procentWinningPlus1: number;
  @Column
  procentLosing: number;
  @Column
  minNumberOfGamesUsedForUpgrade: number;
  @Column
  maxDiffLevels: number;
  @Column
  maxDiffLevelsHighest: number;
  @Column
  latestXGamesToUse: number;
  @Column
  maxLevelUpPerChange: number;
  @Column
  maxLevelDownPerChange: number;

  @Column
  gamesForInactivty: number;

  @Column
  inactivityAmount: number;
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  inactivityUnit: 'months' | 'weeks' | 'days';

  get inactivity(): RankingTiming {
    return {
      amount: this.inactivityAmount,
      unit: this.inactivityUnit
    };
  }
  @Column
  caluclationIntervalLastUpdate: Date;
  @Column
  caluclationIntervalAmount: number;
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  calculationIntervalUnit: 'months' | 'weeks' | 'days';

  get calculationInterval(): RankingTiming {
    return {
      amount: this.caluclationIntervalAmount,
      unit: this.calculationIntervalUnit
    };
  }


  @Column
  periodAmount: number;
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  periodUnit: 'months' | 'weeks' | 'days';

  get period(): RankingTiming {
    return {
      amount: this.periodAmount,
      unit: this.periodUnit
    };
  }
  @Column
  updateIntervalAmountLastUpdate: Date;
  @Column
  updateIntervalAmount: number;
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  updateIntervalUnit: 'months' | 'weeks' | 'days';

  get updateInterval(): RankingTiming {
    return {
      amount: this.updateIntervalAmount,
      unit: this.updateIntervalUnit
    };
  }

  @Column(DataType.ENUM('BVL', 'ORIGINAL', 'LFBB'))
  rankingSystem: RankingSystems;

  @Column
  primary: boolean;

  @Column({ defaultValue: false })
  runCurrently: boolean;

  @Column
  runDate: Date;

  @Column({ defaultValue: 1 })
  differenceForUpgrade: number;

  @Column({ defaultValue: 0 })
  differenceForDowngrade: number;

  @Column({
    type: DataType.ENUM('formula', 'tableLFBB', 'tableBVL'),
    defaultValue: 'formula'
  })
  startingType: StartingType;

  @ForeignKey(() => Player)
  runById: number;

  @BelongsTo(() => Player, {
    foreignKey: 'runById',
    onDelete: 'SET NULL'
  })
  runBy: Player;

  @HasMany(() => RankingPoint, 'SystemId')
  rankingPoints: RankingPoint;


  @BelongsToMany(
    () => RankingSystemGroup,
    () => GroupSystems
  )
  groups: RankingSystemGroup[];

  private _pointsToGoUp: number[];
  private _pointsWhenWinningAgainst: number[];
  private _pointsToGoDown: number[];

  private _levelArray: number[];
  private _levelArrayOneMinus: number[];

  get pointsToGoUp(): number[] {
    return this._pointsToGoUp;
  }
  get pointsWhenWinningAgainst(): number[] {
    return this._pointsWhenWinningAgainst;
  }
  get pointsToGoDown(): number[] {
    return this._pointsToGoDown;
  }

  get levelArray(): number[] {
    return this._levelArray;
  }

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

    this._levelArray.forEach(x => {
      if (x === 0) {
        this._pointsWhenWinningAgainst[x] = 50;
      } else {
        this._pointsWhenWinningAgainst[x] =
          (this._pointsWhenWinningAgainst[x - 1] * this.procentWinning) /
          this.procentWinningPlus1;
      }
    });

    this._levelArrayOneMinus.forEach(x => {
      this._pointsToGoUp[x] =
        (this._pointsWhenWinningAgainst[x] * this.procentWinning) / 100;
    });
    this._levelArrayOneMinus.forEach(x => {
      this._pointsToGoDown[x] =
        (this._pointsWhenWinningAgainst[x + 1] * this.procentLosing) / 100;
    });
  }

  private _lfbbCaps() {
    this._pointsWhenWinningAgainst = [
      10,
      30,
      45,
      60,
      75,
      120,
      165,
      210,
      255,
      390,
      525,
      660,
      795,
      1200,
      1605,
      2010,
      2415
    ];
    this._pointsToGoUp = [
      5,
      20,
      31,
      38,
      61,
      83,
      106,
      128,
      196,
      263,
      331,
      398,
      601,
      803,
      1006,
      1208
    ];
    this._pointsToGoDown = this._pointsToGoUp;
  }
  private _originalCaps() {
    throw new Error('Not implementd');
  }
}
