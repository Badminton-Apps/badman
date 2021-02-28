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
<<<<<<< HEAD:code/backend/packages/_shared/models/sequelize/event/copmetition/sub-event-competition.model.ts
import { BuildOptions } from 'sequelize/types';
import { DrawCompetition, GroupSubEvents, RankingSystemGroup, Team } from '../..';
import { LevelType, SubEventType } from '../../..';
import { EventCompetition } from './event-competition.model';
=======
import { DrawType, GameType, LevelType, SubEventType } from '../../enums';
import { Event } from './event.model';
import { Game } from './game.model';
import { GroupSubEvents, RankingSystemGroup } from '../ranking';
import { Team } from '../team.model';
import { BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Draw } from './draw.model';
>>>>>>> main:code/backend/packages/_shared/models/sequelize/event/sub-event.model.ts

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

  @HasMany(() => Team, 'SubEventId')
  teams: Team[];

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(() => RankingSystemGroup, {
    through: {
      model: () => GroupSubEvents,
      unique: false,
      scope: {
        petType: "competition",
      },
    },
    foreignKey: "subEventId",
    otherKey: "groupId",
  })
  groups: RankingSystemGroup[];

  @HasMany(() => DrawCompetition, 'SubEventId')
  draws: DrawCompetition[];

  @BelongsTo(() => EventCompetition, 'EventId')
  event?: EventCompetition;

  @Unique('unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Column
  EventId: string;

  // Belongs to many RankingSystemGroup
  getRankingSystemGroups!: BelongsToManyGetAssociationsMixin<RankingSystemGroup>;
  setRankingSystemGroup!: BelongsToManySetAssociationsMixin<RankingSystemGroup, string>;
  addRankingSystemGroups!: BelongsToManyAddAssociationsMixin<RankingSystemGroup, string>;
  addRankingSystemGroup!: BelongsToManyAddAssociationMixin<RankingSystemGroup, string>;
  removeRankingSystemGroup!: BelongsToManyRemoveAssociationMixin<RankingSystemGroup, string>;
  removeRankingSystemGroups!: BelongsToManyRemoveAssociationsMixin<RankingSystemGroup, string>;
  hasRankingSystemGroup!: BelongsToManyHasAssociationMixin<RankingSystemGroup, string>;
  hasRankingSystemGroups!: BelongsToManyHasAssociationsMixin<RankingSystemGroup, string>;
  countRankingSystemGroup!: BelongsToManyCountAssociationsMixin;

  // Has many Team
  getTeams!: HasManyGetAssociationsMixin<Team>;
  setTeams!: HasManySetAssociationsMixin<Team, string>;
  addTeams!: HasManyAddAssociationsMixin<Team, string>;
  addTeam!: HasManyAddAssociationMixin<Team, string>;
  removeTeam!: HasManyRemoveAssociationMixin<Team, string>;
  removeTeams!: HasManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: HasManyHasAssociationMixin<Team, string>;
  hasTeams!: HasManyHasAssociationsMixin<Team, string>;
  countTeams!: HasManyCountAssociationsMixin;

  // Has many Draw
  getDraws!: HasManyGetAssociationsMixin<Draw>;
  setDraws!: HasManySetAssociationsMixin<Draw, string>;
  addDraws!: HasManyAddAssociationsMixin<Draw, string>;
  addDraw!: HasManyAddAssociationMixin<Draw, string>;
  removeDraw!: HasManyRemoveAssociationMixin<Draw, string>;
  removeDraws!: HasManyRemoveAssociationsMixin<Draw, string>;
  hasDraw!: HasManyHasAssociationMixin<Draw, string>;
  hasDraws!: HasManyHasAssociationsMixin<Draw, string>;
  countDraws!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEvent!: BelongsToGetAssociationMixin<Event>;
  setEvent!: BelongsToSetAssociationMixin<Event, string>;
}
