import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions
} from 'sequelize';
import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { RankingSystem } from '../../..'; 
import {
  GroupSubEventCompetition,
  GroupSubEventTournament,
  SubEventCompetition,
  SubEventTournament
} from '../event';
import { GroupSystems } from './group_system.model';

@Table({
  timestamps: true,
  tableName: 'Groups',
  schema: 'ranking'
})
export class RankingSystemGroup extends Model {
  constructor(values?: Partial<RankingSystemGroup>, options?: BuildOptions) {
    super(values, options);
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
    () => SubEventCompetition,
    () => GroupSubEventCompetition
  )
  subEventCompetitions: SubEventCompetition[];

  @BelongsToMany(
    () => SubEventTournament,
    () => GroupSubEventTournament
  )
  subEventTournaments: SubEventTournament[];

  @BelongsToMany(
    () => RankingSystem,
    () => GroupSystems
  )
  systems: RankingSystem[];

  // Belongs to many SubEventTournament
  getSubEventTournaments!: BelongsToManyGetAssociationsMixin<
    SubEventTournament
  >;
  setSubEventTournament!: BelongsToManySetAssociationsMixin<
    SubEventTournament,
    string
  >;
  addSubEventTournaments!: BelongsToManyAddAssociationsMixin<
    SubEventTournament,
    string
  >;
  addSubEventTournament!: BelongsToManyAddAssociationMixin<
    SubEventTournament,
    string
  >;
  removeSubEventTournament!: BelongsToManyRemoveAssociationMixin<
    SubEventTournament,
    string
  >;
  removeSubEventTournaments!: BelongsToManyRemoveAssociationsMixin<
    SubEventTournament,
    string
  >;
  hasSubEventTournament!: BelongsToManyHasAssociationMixin<
    SubEventTournament,
    string
  >;
  hasSubEventTournaments!: BelongsToManyHasAssociationsMixin<
    SubEventTournament,
    string
  >;
  countSubEventTournament!: BelongsToManyCountAssociationsMixin;

  // Belongs to many SubEventCompetition
  getSubEventCompetitions!: BelongsToManyGetAssociationsMixin<
    SubEventCompetition
  >;
  setSubEventCompetition!: BelongsToManySetAssociationsMixin<
    SubEventCompetition,
    string
  >;
  addSubEventCompetitions!: BelongsToManyAddAssociationsMixin<
    SubEventCompetition,
    string
  >;
  addSubEventCompetition!: BelongsToManyAddAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEventCompetition!: BelongsToManyRemoveAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEventCompetitions!: BelongsToManyRemoveAssociationsMixin<
    SubEventCompetition,
    string
  >;
  hasSubEventCompetition!: BelongsToManyHasAssociationMixin<
    SubEventCompetition,
    string
  >;
  hasSubEventCompetitions!: BelongsToManyHasAssociationsMixin<
    SubEventCompetition,
    string
  >;
  countSubEventCompetition!: BelongsToManyCountAssociationsMixin;

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
