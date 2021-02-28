import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { DrawType, GameType, LevelType, SubEventType } from '../../enums';
import { Event } from './event.model';
import { Game } from './game.model';
import { GroupSubEvents, RankingSystemGroup } from '../ranking';
import { Team } from '../team.model';
import { BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyAddAssociationsMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyHasAssociationsMixin, BelongsToManyRemoveAssociationMixin, BelongsToManyRemoveAssociationsMixin, BelongsToManySetAssociationsMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import { Draw } from './draw.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEvent extends Model {
  constructor(values?: Partial<SubEvent>, options?: BuildOptions){
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
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(
    () => RankingSystemGroup,
    () => GroupSubEvents
  )
  groups: RankingSystemGroup[];

  @HasMany(() => Team, 'SubEventId')
  teams: Team[];

  @HasMany(() => Draw, 'SubEventId')
  draws: Draw[];

  @BelongsTo(() => Event, 'EventId')
  event?: Event;

  @Unique('unique_constraint')
  @ForeignKey(() => Event)
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
