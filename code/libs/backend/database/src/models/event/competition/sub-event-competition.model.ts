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
import { RankingGroup } from '../../ranking';
import { DrawCompetition } from './draw-competition.model';
import { EventCompetition } from './event-competition.model';
import { RankingGroupSubEventCompetitionMembership } from './group-subevent-membership.model';

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
  @Field(() => String, { nullable: true })
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
  eventEntries: EventEntry[];

  @Field(() => [RankingGroup], { nullable: true })
  @BelongsToMany(
    () => RankingGroup,
    () => RankingGroupSubEventCompetitionMembership
  )
  rankingGroups: RankingGroup[];

  @Field(() => [DrawCompetition], { nullable: true })
  @HasMany(() => DrawCompetition, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  drawCompetitions: DrawCompetition[];

  @Field(() => EventCompetition, { nullable: true })
  @BelongsTo(() => EventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  eventCompetition?: EventCompetition;

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
  getRankingGroups!: BelongsToManyGetAssociationsMixin<RankingGroup>;
  setRankingGroups!: BelongsToManySetAssociationsMixin<RankingGroup, string>;
  addRankingGroups!: BelongsToManyAddAssociationsMixin<RankingGroup, string>;
  addRankingGroup!: BelongsToManyAddAssociationMixin<RankingGroup, string>;
  removeRankingGroup!: BelongsToManyRemoveAssociationMixin<
    RankingGroup,
    string
  >;
  removeRankingGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingGroup,
    string
  >;
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
  removeDrawCompetition!: HasManyRemoveAssociationMixin<
    DrawCompetition,
    string
  >;
  removeDrawCompetitions!: HasManyRemoveAssociationsMixin<
    DrawCompetition,
    string
  >;
  hasDrawCompetition!: HasManyHasAssociationMixin<DrawCompetition, string>;
  hasDrawCompetitions!: HasManyHasAssociationsMixin<DrawCompetition, string>;
  countDrawCompetitions!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEventCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setEventCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;
}
