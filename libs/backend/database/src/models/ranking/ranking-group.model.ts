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
@ObjectType({ description: 'A RankingGroup' })
export class RankingGroup extends Model {
  constructor(values?: Partial<RankingGroup>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Unique
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @BelongsToMany(
    () => SubEventCompetition,
    () => RankingGroupSubEventCompetitionMembership
  )
  subEventCompetitions?: SubEventCompetition[];

  @BelongsToMany(
    () => SubEventTournament,
    () => RankingGroupSubEventTournamentMembership
  )
  subEventTournaments?: SubEventTournament[];

  @BelongsToMany(() => RankingSystem, () => RankingSystemRankingGroupMembership)
  rankingSystems?: RankingSystem[];

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

  // Belongs to many RankingSystem
  getRankingSystems!: BelongsToManyGetAssociationsMixin<RankingSystem>;
  setRankingSystems!: BelongsToManySetAssociationsMixin<RankingSystem, string>;
  addRankingSystems!: BelongsToManyAddAssociationsMixin<RankingSystem, string>;
  addRankingSystem!: BelongsToManyAddAssociationMixin<RankingSystem, string>;
  removeRankingSystem!: BelongsToManyRemoveAssociationMixin<RankingSystem, string>;
  removeRankingSystems!: BelongsToManyRemoveAssociationsMixin<RankingSystem, string>;
  hasRankingSystem!: BelongsToManyHasAssociationMixin<RankingSystem, string>;
  hasRankingSystems!: BelongsToManyHasAssociationsMixin<RankingSystem, string>;
  countRankingSystem!: BelongsToManyCountAssociationsMixin;
}
