import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import {
  DrawCompetition,
  EventCompetition,
  GroupSubEvents,
  RankingSystemGroup,
  Team
} from '../..';
import { LevelType, SubEventType } from '../../..';
import { TeamSubEventMembership } from '../../team-subEvent-membership.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEventCompetition extends Model {
  constructor(values?: Partial<SubEventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Column
  maxLevel?: number;

  @Column
  minBaseIndex?: number;
  
  @Column
  maxBaseIndex?: number;

  @BelongsToMany(
    () => Team,
    () => TeamSubEventMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  teams: (Team & { TeamMembership: TeamSubEventMembership })[];

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(() => RankingSystemGroup, {
    through: {
      model: () => GroupSubEvents,
      unique: false,
      scope: {
        petType: 'competition'
      }
    },
    foreignKey: 'subeventId',
    otherKey: 'groupId'
  })
  groups: RankingSystemGroup[];

  @HasMany(() => DrawCompetition, 'subeventId')
  draws: DrawCompetition[];

  @BelongsTo(() => EventCompetition, 'eventId')
  event?: EventCompetition;

  @Unique('unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Column
  eventId: string;

  // Belongs to many RankingSystemGroup
  getRankingSystemGroups!: BelongsToManyGetAssociationsMixin<
    RankingSystemGroup
  >;
  setRankingSystemGroup!: BelongsToManySetAssociationsMixin<
    RankingSystemGroup,
    string
  >;
  addRankingSystemGroups!: BelongsToManyAddAssociationsMixin<
    RankingSystemGroup,
    string
  >;
  addRankingSystemGroup!: BelongsToManyAddAssociationMixin<
    RankingSystemGroup,
    string
  >;
  removeRankingSystemGroup!: BelongsToManyRemoveAssociationMixin<
    RankingSystemGroup,
    string
  >;
  removeRankingSystemGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingSystemGroup,
    string
  >;
  hasRankingSystemGroup!: BelongsToManyHasAssociationMixin<
    RankingSystemGroup,
    string
  >;
  hasRankingSystemGroups!: BelongsToManyHasAssociationsMixin<
    RankingSystemGroup,
    string
  >;
  countRankingSystemGroup!: BelongsToManyCountAssociationsMixin;

  // Belongs to many Team
  getTeams!: BelongsToManyGetAssociationsMixin<Team>;
  setTeam!: BelongsToManySetAssociationsMixin<Team, string>;
  addTeams!: BelongsToManyAddAssociationsMixin<Team, string>;
  addTeam!: BelongsToManyAddAssociationMixin<Team, string>;
  removeTeam!: BelongsToManyRemoveAssociationMixin<Team, string>;
  removeTeams!: BelongsToManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: BelongsToManyHasAssociationMixin<Team, string>;
  hasTeams!: BelongsToManyHasAssociationsMixin<Team, string>;
  countTeam!: BelongsToManyCountAssociationsMixin;

  // Has many draw
  getdraws!: HasManyGetAssociationsMixin<DrawCompetition>;
  setdraws!: HasManySetAssociationsMixin<DrawCompetition, string>;
  adddraws!: HasManyAddAssociationsMixin<DrawCompetition, string>;
  adddraw!: HasManyAddAssociationMixin<DrawCompetition, string>;
  removedraw!: HasManyRemoveAssociationMixin<DrawCompetition, string>;
  removedraws!: HasManyRemoveAssociationsMixin<DrawCompetition, string>;
  hasdraw!: HasManyHasAssociationMixin<DrawCompetition, string>;
  hasdraws!: HasManyHasAssociationsMixin<DrawCompetition, string>;
  countdraws!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEvent!: BelongsToGetAssociationMixin<EventCompetition>;
  setEvent!: BelongsToSetAssociationMixin<EventCompetition, string>;
}
