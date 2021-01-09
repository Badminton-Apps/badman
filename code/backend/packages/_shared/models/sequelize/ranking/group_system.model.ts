import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';
import { RankingSystem } from '../ranking/system.model';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSystems extends Model<GroupSystems> {
  @ForeignKey(() => RankingSystem)
  @Column
  SystemId: number;

  @ForeignKey(() => RankingSystemGroup)
  @Column
  GroupId: number;
}
