import { BelongsTo, Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Player } from '../player.model';
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'Places',
  schema: 'ranking'
})
export class RankingPlace extends Model<RankingPlace> {
  @Column({ unique: 'compositeIndex' })
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

  @Column
  singleInactive: boolean;
  @Column
  mixInactive: boolean;
  @Column
  doubleInactive: boolean;

  @Column
  updatePossible: boolean;

  @ForeignKey(() => Player)
  @Column({ unique: 'compositeIndex' })
  PlayerId: number;

  @ForeignKey(() => RankingSystem)
  @Column({ unique: 'compositeIndex' })
  SystemId: number;

  @BelongsTo(() => Player, 'PlayerId')
  player: Player;

  @BelongsTo(() => RankingSystem, { foreignKey: 'SystemId', onDelete: 'CASCADE' })
  rankingSystem: RankingSystem;
}
