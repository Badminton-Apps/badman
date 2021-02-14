import {
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';
import { SubEvent } from '../event';

@Table({
  timestamps: false,
  schema: 'ranking'
})
export class GroupSubEvents extends Model {
  @Unique('unique_constraint')
  @ForeignKey(() => SubEvent)
  @Column
  SubEventId: string;

  @Unique('unique_constraint')
  @ForeignKey(() => RankingSystemGroup)
  @Column
  GroupId: string;
}
