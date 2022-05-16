import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { GroupSubEventCompetitionMembership } from './group-subevent-membership.model';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A SubEventCompetition' })
export class SubEventCompetition extends Model {
  constructor(values?: Partial<SubEventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  name: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field(() => String,{ nullable: true })
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Field({ nullable: true })
  @Column
  level?: number;

  @Field({ nullable: true })
  @Column
  maxLevel?: number;

  @Field({ nullable: true })
  @Column
  minBaseIndex?: number;

  @Field({ nullable: true })
  @Column
  maxBaseIndex?: number;

  @Field(() => [EventEntry], { nullable: true })
  @HasMany(() => EventEntry, {
    foreignKey: 'subEventId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'competition',
    },
  })
  entries: EventEntry[];

  @Field(() => [RankingSystemGroup], { nullable: true })
  @BelongsToMany(() => RankingSystemGroup, () => GroupSubEventCompetitionMembership)
  groups: RankingSystemGroup[];

  @Field(() => [DrawCompetition], { nullable: true })
  @HasMany(() => DrawCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  draws: DrawCompetition[];

  @Field(() => EventCompetition, { nullable: true })
  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  event?: EventCompetition;

  @Unique('SubEventCompetitions_unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Field({ nullable: true })
  @Column
  eventId: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field({ nullable: true })
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
