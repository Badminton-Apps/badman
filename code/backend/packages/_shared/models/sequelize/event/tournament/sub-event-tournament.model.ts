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
import { EventTournament } from './event-tournament.model';
import { GroupSubEventTournament } from './group-subevent.model';
import { DrawTournament } from './draw-tournament.model';
import { RankingSystemGroup } from '../../ranking';
import { GameType, SubEventType } from '../../../enums';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEventTournament extends Model {
  constructor(values?: Partial<SubEventTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('SubEventTournaments_unique_constraint')
  @Column
  name: string;

  @Unique('SubEventTournaments_unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('SubEventTournaments_unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column
  level?: number;

  @Unique('SubEventTournaments_unique_constraint')
  @Column
  visualCode: string;

  @BelongsToMany(
    () => RankingSystemGroup,
    () => GroupSubEventTournament
  )
  groups: RankingSystemGroup[];

  @HasMany(() => DrawTournament, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE'
  })
  draws: DrawTournament[];

  @BelongsTo(() => EventTournament, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE'
  })
  event?: EventTournament;

  @Unique('SubEventTournaments_unique_constraint')
  @ForeignKey(() => EventTournament)
  @Column
  eventId: string;

  // Belongs to many Group
  getGroups!: BelongsToManyGetAssociationsMixin<RankingSystemGroup>;
  setGroups!: BelongsToManySetAssociationsMixin<RankingSystemGroup, string>;
  addGroups!: BelongsToManyAddAssociationsMixin<RankingSystemGroup, string>;
  addGroup!: BelongsToManyAddAssociationMixin<RankingSystemGroup, string>;
  removeGroup!: BelongsToManyRemoveAssociationMixin<RankingSystemGroup, string>;
  removeGroups!: BelongsToManyRemoveAssociationsMixin<RankingSystemGroup, string>;
  hasGroup!: BelongsToManyHasAssociationMixin<RankingSystemGroup, string>;
  hasGroups!: BelongsToManyHasAssociationsMixin<RankingSystemGroup, string>;
  countGroup!: BelongsToManyCountAssociationsMixin;

  // Has many Draw
  getDraws!: HasManyGetAssociationsMixin<DrawTournament>;
  setDraws!: HasManySetAssociationsMixin<DrawTournament, string>;
  addDraws!: HasManyAddAssociationsMixin<DrawTournament, string>;
  addDraw!: HasManyAddAssociationMixin<DrawTournament, string>;
  removeDraw!: HasManyRemoveAssociationMixin<DrawTournament, string>;
  removeDraws!: HasManyRemoveAssociationsMixin<DrawTournament, string>;
  hasDraw!: HasManyHasAssociationMixin<DrawTournament, string>;
  hasDraws!: HasManyHasAssociationsMixin<DrawTournament, string>;
  countDraws!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEvent!: BelongsToGetAssociationMixin<EventTournament>;
  setEvent!: BelongsToSetAssociationMixin<EventTournament, string>;
}
