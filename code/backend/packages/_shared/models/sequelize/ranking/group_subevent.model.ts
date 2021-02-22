import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSubEvents extends Model {
  @PrimaryKey
  @Column
  subEventId: string;

  @PrimaryKey
  @Column
  subEventType: string;

  @PrimaryKey
  @ForeignKey(() => RankingSystemGroup)
  @Column
  groupId: string;
}
