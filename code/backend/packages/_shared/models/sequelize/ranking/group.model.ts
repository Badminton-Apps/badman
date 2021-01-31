import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
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
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique
  @Column
  name: string;

  @BelongsToMany(
    () => SubEvent,
    () => GroupSubEvents
  )
  subEvents: SubEvent[];

  @BelongsToMany(
    () => RankingSystem,
    () => GroupSystems
  )
  systems: RankingSystem[];
}
