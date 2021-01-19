import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { RankingSystemGroup } from './group.model';
import { SubEvent } from '../event';

@Table({
  timestamps: false,
  schema: 'ranking',
})
export class GroupSubEvents extends Model<GroupSubEvents> {
  @ForeignKey(() => SubEvent)
  @Column({ unique: 'unique_constraint' })
  SubEventId: number;

  @ForeignKey(() => RankingSystemGroup)
  @Column({ unique: 'unique_constraint' })
  GroupId: number;
}
