import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';
import { RankingSystem } from '../../..';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSystems extends Model {
  @ForeignKey(() => RankingSystem)
  @Column
  SystemId: string;

  @ForeignKey(() => RankingSystemGroup)
  @Column
  GroupId: string;
}
