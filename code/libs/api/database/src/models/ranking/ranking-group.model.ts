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
  RankingGroupSubEventCompetitionMembership,
  RankingGroupSubEventTournamentMembership,
  SubEventCompetition,
  SubEventTournament,
} from '../event';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { RankingSystem } from './ranking-system.model';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingGroups' })
export class RankingGroups extends Model {
  constructor(values?: Partial<RankingGroups>, options?: BuildOptions) {
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

  @BelongsToMany(() => SubEventCompetition, () => RankingGroupSubEventCompetitionMembership)
  subEventCompetitions: SubEventCompetition[];

  @BelongsToMany(() => SubEventTournament, () => RankingGroupSubEventTournamentMembership)
  subEventTournaments: SubEventTournament[];

  @BelongsToMany(() => RankingSystem, () => RankingSystemRankingGroupMembership)
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
