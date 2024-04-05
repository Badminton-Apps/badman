import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
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
import { SubEventTypeEnum } from '@badman/utils';
import { RankingGroup } from '../../ranking';
import { EventEntry } from '../entry.model';
import { DrawCompetition } from './draw-competition.model';
import { EventCompetition } from './event-competition.model';
import { RankingGroupSubEventCompetitionMembership } from './group-subevent-membership.model';
import { Relation } from '../../../wrapper';

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
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field(() => String)
  @Column(DataType.STRING)
  name!: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field(() => String)
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType!: SubEventTypeEnum;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  level?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxLevel?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  minBaseIndex?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  maxBaseIndex?: number;

  @Field(() => [EventEntry], { nullable: true })
  @HasMany(() => EventEntry, {
    foreignKey: 'subEventId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'competition',
    },
  })
  eventEntries?: Relation<EventEntry[]>;

  @Field(() => [RankingGroup], { nullable: true })
  @BelongsToMany(() => RankingGroup, () => RankingGroupSubEventCompetitionMembership)
  rankingGroups?: Relation<RankingGroup[]>;

  @Field(() => [DrawCompetition], { nullable: true })
  @HasMany(() => DrawCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  drawCompetitions?: Relation<DrawCompetition[]>;

  @Field(() => EventCompetition, { nullable: true })
  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  eventCompetition?: Relation<EventCompetition>;

  @Unique('SubEventCompetitions_unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  eventId!: string;

  @Unique('SubEventCompetitions_unique_constraint')
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  visualCode!: string;

  // Belongs to many Group
  getRankingGroups!: BelongsToManyGetAssociationsMixin<RankingGroup>;
  setRankingGroups!: BelongsToManySetAssociationsMixin<RankingGroup, string>;
  addRankingGroups!: BelongsToManyAddAssociationsMixin<RankingGroup, string>;
  addRankingGroup!: BelongsToManyAddAssociationMixin<RankingGroup, string>;
  removeRankingGroup!: BelongsToManyRemoveAssociationMixin<RankingGroup, string>;
  removeRankingGroups!: BelongsToManyRemoveAssociationsMixin<RankingGroup, string>;
  hasRankingGroup!: BelongsToManyHasAssociationMixin<RankingGroup, string>;
  hasRankingGroups!: BelongsToManyHasAssociationsMixin<RankingGroup, string>;
  countRankingGroup!: BelongsToManyCountAssociationsMixin;

  // Has many EventEntry
  getEventEntries!: HasManyGetAssociationsMixin<EventEntry>;
  setEventEntries!: HasManySetAssociationsMixin<EventEntry, string>;
  addEventEntries!: HasManyAddAssociationsMixin<EventEntry, string>;
  addEventEntry!: HasManyAddAssociationMixin<EventEntry, string>;
  removeEventEntry!: HasManyRemoveAssociationMixin<EventEntry, string>;
  removeEventEntries!: HasManyRemoveAssociationsMixin<EventEntry, string>;
  hasEventEntry!: HasManyHasAssociationMixin<EventEntry, string>;
  hasEventEntries!: HasManyHasAssociationsMixin<EventEntry, string>;
  countEventEntries!: HasManyCountAssociationsMixin;

  // Has many Draw
  getDrawCompetitions!: HasManyGetAssociationsMixin<DrawCompetition>;
  setDrawCompetitions!: HasManySetAssociationsMixin<DrawCompetition, string>;
  addDrawCompetitions!: HasManyAddAssociationsMixin<DrawCompetition, string>;
  addDrawCompetition!: HasManyAddAssociationMixin<DrawCompetition, string>;
  removeDrawCompetition!: HasManyRemoveAssociationMixin<DrawCompetition, string>;
  removeDrawCompetitions!: HasManyRemoveAssociationsMixin<DrawCompetition, string>;
  hasDrawCompetition!: HasManyHasAssociationMixin<DrawCompetition, string>;
  hasDrawCompetitions!: HasManyHasAssociationsMixin<DrawCompetition, string>;
  countDrawCompetitions!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEventCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setEventCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;
}

// A graphql type for showing the average level with the subevent this is for single, double and mixed per gender
@ObjectType({ description: 'A SubEventCompetition' })
export class SubEventCompetitionAverageLevel {
  @Field(() => String, { nullable: true })
  gender!: 'M' | 'F';

  @Field(() => Float, { nullable: true })
  single?: number;
  @Field(() => Int, { nullable: true })
  singleCount?: number;

  @Field(() => Float, { nullable: true })
  double?: number;
  @Field(() => Int, { nullable: true })
  doubleCount?: number;

  @Field(() => Float, { nullable: true })
  mix?: number;
  @Field(() => Int, { nullable: true })
  mixCount?: number;
}
