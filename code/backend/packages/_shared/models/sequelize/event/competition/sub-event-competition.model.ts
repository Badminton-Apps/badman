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
  HasManySetAssociationsMixin,
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
  Unique,
} from 'sequelize-typescript';
import { EventEntry } from '..';
import { SubEventType } from '../../../enums';
import { RankingSystemGroup } from '../../ranking';
import { DrawCompetition } from './draw-competition.model';
import { EventCompetition } from './event-competition.model';
import { GroupSubEventCompetition } from './group-subevent.model';

@Table({
  timestamps: true,
  schema: 'event',
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

  @Unique('SubEventCompetitions_unique_constraint')
  @Column
  name: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Column
  level?: number;

  @Column
  maxLevel?: number;
 
  @Column
  minBaseIndex?: number;

  @Column
  maxBaseIndex?: number;

  @HasMany(() => EventEntry, {
    foreignKey: 'subEventId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'competition',
    },
  })
  entries: EventEntry[];

  @BelongsToMany(() => RankingSystemGroup, () => GroupSubEventCompetition)
  groups: RankingSystemGroup[];

  @HasMany(() => DrawCompetition, { 
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  draws: DrawCompetition[];

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  event?: EventCompetition;

  @Unique('SubEventCompetitions_unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Column
  eventId: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Column
  visualCode: string;

  // Belongs to many Group
  getGroups!: BelongsToManyGetAssociationsMixin<RankingSystemGroup>;
  setGroups!: BelongsToManySetAssociationsMixin<RankingSystemGroup, string>;
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

  // Has many EventEntry
  getEventEntrys!: HasManyGetAssociationsMixin<EventEntry>;
  setEventEntrys!: HasManySetAssociationsMixin<EventEntry, string>;
  addEventEntrys!: HasManyAddAssociationsMixin<EventEntry, string>;
  addEventEntry!: HasManyAddAssociationMixin<EventEntry, string>;
  removeEventEntry!: HasManyRemoveAssociationMixin<EventEntry, string>;
  removeEventEntrys!: HasManyRemoveAssociationsMixin<EventEntry, string>;
  hasEventEntry!: HasManyHasAssociationMixin<EventEntry, string>;
  hasEventEntrys!: HasManyHasAssociationsMixin<EventEntry, string>;
  countEventEntrys!: HasManyCountAssociationsMixin;

  // Has many Draw
  getDraws!: HasManyGetAssociationsMixin<DrawCompetition>;
  setDraws!: HasManySetAssociationsMixin<DrawCompetition, string>;
  addDraws!: HasManyAddAssociationsMixin<DrawCompetition, string>;
  addDraw!: HasManyAddAssociationMixin<DrawCompetition, string>;
  removeDraw!: HasManyRemoveAssociationMixin<DrawCompetition, string>;
  removeDraws!: HasManyRemoveAssociationsMixin<DrawCompetition, string>;
  hasDraw!: HasManyHasAssociationMixin<DrawCompetition, string>;
  hasDraws!: HasManyHasAssociationsMixin<DrawCompetition, string>;
  countDraws!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEvent!: BelongsToGetAssociationMixin<EventCompetition>;
  setEvent!: BelongsToSetAssociationMixin<EventCompetition, string>;
}
