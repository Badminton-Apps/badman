import { BelongsToMany, Column, HasMany, Model, Table } from 'sequelize-typescript';
import { RankingSystem } from '../../..';
import { SubEvent } from '../event';
import { GroupSubEvents } from './group_subevent.model';
import { GroupSystems } from './group_system.model';

@Table({
  timestamps: true,
  tableName: 'Groups',
  schema: 'ranking'
})
export class RankingSystemGroup extends Model<RankingSystemGroup> {
  @Column
  name: string;

  @BelongsToMany(() => SubEvent, () => GroupSubEvents)
  subEvents: SubEvent[];

  @BelongsToMany(() => RankingSystem, () => GroupSystems)
  systems: RankingSystem[];
}
