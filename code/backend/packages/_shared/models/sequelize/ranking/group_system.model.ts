import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';
import { RankingSystem } from '../../..';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSystems extends Model<GroupSystems> {
  @ForeignKey(() => RankingSystem)
  @Column({ unique: 'unique_constraint' })
  SystemId: number;

  @ForeignKey(() => RankingSystemGroup)
  @Column({ unique: 'unique_constraint' })
  GroupId: number;
}
