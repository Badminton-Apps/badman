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
import { BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BuildOptions } from 'sequelize';
import { RankingSystem } from '../../..';
import { SubEvent } from '../event';
import { GroupSubEvents } from './group_subevent.model';
import { GroupSystems } from './group_system.model';

@Table({
  timestamps: true,
  tableName: 'Groups',
  schema: 'ranking'
})
export class RankingSystemGroup extends Model {
  constructor(values ?: Partial<RankingSystemGroup>, options?: BuildOptions){
    super(values, options)
  }

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

  // Belongs to many SubEvent
  getSubEvents!: BelongsToManyGetAssociationsMixin<SubEvent>;
  setSubEvent!: BelongsToManySetAssociationsMixin<SubEvent, string>;
  addSubEvents!: BelongsToManyAddAssociationsMixin<SubEvent, string>;
  addSubEvent!: BelongsToManyAddAssociationMixin<SubEvent, string>;
  removeSubEvent!: BelongsToManyRemoveAssociationMixin<SubEvent, string>;
  removeSubEvents!: BelongsToManyRemoveAssociationsMixin<SubEvent, string>;
  hasSubEvent!: BelongsToManyHasAssociationMixin<SubEvent, string>;
  hasSubEvents!: BelongsToManyHasAssociationsMixin<SubEvent, string>;
  countSubEvent!: BelongsToManyCountAssociationsMixin;

  // Belongs to many System
  getSystems!: BelongsToManyGetAssociationsMixin<RankingSystem>;
  setSystem!: BelongsToManySetAssociationsMixin<RankingSystem, string>;
  addSystems!: BelongsToManyAddAssociationsMixin<RankingSystem, string>;
  addSystem!: BelongsToManyAddAssociationMixin<RankingSystem, string>;
  removeSystem!: BelongsToManyRemoveAssociationMixin<RankingSystem, string>;
  removeSystems!: BelongsToManyRemoveAssociationsMixin<RankingSystem, string>;
  hasSystem!: BelongsToManyHasAssociationMixin<RankingSystem, string>;
  hasSystems!: BelongsToManyHasAssociationsMixin<RankingSystem, string>;
  countSystem!: BelongsToManyCountAssociationsMixin;
}
