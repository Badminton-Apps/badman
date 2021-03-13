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
import { RankingSystemGroup, GroupSubEvents, DrawTournament } from '../..';
import { SubEventType, GameType } from '../../..';
import { EventTournament } from './event-tournament.model';

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

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(() => RankingSystemGroup, {
    through: {
      model: () => GroupSubEvents,
      unique: false,
      scope: {
        petType: 'tournament'
      }
    },
    foreignKey: 'subeventId',
    otherKey: 'groupId'
  })
  groups: RankingSystemGroup[];

  @HasMany(() => DrawTournament, 'subeventId')
  draws: DrawTournament[];

  @BelongsTo(() => EventTournament, 'eventId')
  event?: EventTournament;

  @Unique('unique_constraint')
  @ForeignKey(() => EventTournament)
  @Column
  eventId: string;

  // Belongs to many Group
  getGroups!: BelongsToManyGetAssociationsMixin<RankingSystemGroup>;
  setGroup!: BelongsToManySetAssociationsMixin<RankingSystemGroup, string>;
  addGroups!: BelongsToManyAddAssociationsMixin<RankingSystemGroup, string>;
  addGroup!: BelongsToManyAddAssociationMixin<RankingSystemGroup, string>;
  removeGroup!: BelongsToManyRemoveAssociationMixin<RankingSystemGroup, string>;
  removeGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingSystemGroup,
    string
  >;
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
