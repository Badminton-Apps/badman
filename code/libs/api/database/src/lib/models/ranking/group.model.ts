import { Field, ID, ObjectType } from '@nestjs/graphql';
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
  BuildOptions,
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
  Unique,
} from 'sequelize-typescript';
import {
  GroupSubEventCompetitionMembership,
  GroupSubEventTournamentMembership,
  SubEventCompetition,
  SubEventTournament,
} from '../event';
import { GroupSystemsMembership } from './group-system-membership.model';
import { RankingSystem } from './system.model';

@Table({
  timestamps: true,
  tableName: 'Groups',
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingSystemGroup' })
export class RankingSystemGroup extends Model {
  constructor(values?: Partial<RankingSystemGroup>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique
  @Field({ nullable: true })
  @Column
  name: string;

  @BelongsToMany(() => SubEventCompetition, () => GroupSubEventCompetitionMembership)
  subEventCompetitions: SubEventCompetition[];

  @BelongsToMany(() => SubEventTournament, () => GroupSubEventTournamentMembership)
  subEventTournaments: SubEventTournament[];

  @BelongsToMany(() => RankingSystem, () => GroupSystemsMembership)
  rankingSystems: RankingSystem[];

  // Belongs to many SubEventTournament
  getSubEventTournaments!: BelongsToManyGetAssociationsMixin<SubEventTournament>;
  setSubEventTournaments!: BelongsToManySetAssociationsMixin<
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
  getSubEventCompetitions!: BelongsToManyGetAssociationsMixin<SubEventCompetition>;
  setSubEventCompetitions!: BelongsToManySetAssociationsMixin<
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
