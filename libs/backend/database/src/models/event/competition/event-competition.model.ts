import { LevelType, UsedRankingTiming } from '@badman/utils';
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import {
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
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique,
} from 'sequelize-typescript';
import {
  AvailabilityExceptionInputType,
  ExceptionType,
  InfoEventInputType,
  InfoEventType,
  Slugify,
} from '../../../types';
import { Relation } from '../../../wrapper';
import { Role } from '../../security';
import { AvailabilityException } from '../availability.model';
import { Comment } from './../../comment.model';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A EventCompetition' })
export class EventCompetition extends Model {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique('EventCompetitions_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Unique('EventCompetitions_unique_constraint')
  @Field(() => Int)
  @Column(DataType.NUMBER)
  season!: number;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  lastSync?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  openDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  closeDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  changeOpenDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  changeCloseDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  changeCloseRequestDate?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  contactEmail?: string;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  comments?: Relation<Comment[]>;

  @Field(() => [Role], { nullable: true })
  @HasMany(() => Role, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  roles?: Relation<Role[]>;

  @Field(() => [SubEventCompetition], { nullable: true })
  @HasMany(() => SubEventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  subEventCompetitions?: Relation<SubEventCompetition[]>;

  @Field(() => String, { nullable: true })
  @Unique('EventCompetitions_unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAL'))
  type!: LevelType;

  @Unique('EventCompetitions_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  started?: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  slug?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  teamMatcher?: string;

  @Field(() => Int)
  @Column(DataType.NUMBER)
  usedRankingAmount!: number;

  @Field(() => String)
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  usedRankingUnit!: 'months' | 'weeks' | 'days';

  get usedRanking(): UsedRankingTiming {
    return {
      amount: this.usedRankingAmount,
      unit: this.usedRankingUnit,
    };
  }

  @Field(() => Boolean)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  official!: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  state?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  country?: string;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  checkEncounterForFilledIn?: boolean;

  @Field(() => [ExceptionType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  exceptions?: Relation<EventException[]>;

  @Field(() => [InfoEventType], { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  infoEvents?: Relation<InfoEvent[]>;

  regenerateSlug!: Slugify<EventCompetition>;

  // Has many SubEventCompetition
  getSubEventCompetitions!: HasManyGetAssociationsMixin<SubEventCompetition>;
  setSubEventCompetitions!: HasManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEventCompetitions!: HasManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEventCompetition!: HasManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEventCompetition!: HasManyRemoveAssociationMixin<SubEventCompetition, string>;
  removeSubEventCompetitions!: HasManyRemoveAssociationsMixin<SubEventCompetition, string>;
  hasSubEventCompetition!: HasManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEventCompetitions!: HasManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEventCompetitions!: HasManyCountAssociationsMixin;

  // Has many Comment
  getComments!: HasManyGetAssociationsMixin<Comment>;
  setComments!: HasManySetAssociationsMixin<Comment, string>;
  addComments!: HasManyAddAssociationsMixin<Comment, string>;
  addComment!: HasManyAddAssociationMixin<Comment, string>;
  removeComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasComment!: HasManyHasAssociationMixin<Comment, string>;
  hasComments!: HasManyHasAssociationsMixin<Comment, string>;
  countComments!: HasManyCountAssociationsMixin;

  // Has many Role
  getRoles!: HasManyGetAssociationsMixin<Role>;
  setRoles!: HasManySetAssociationsMixin<Role, string>;
  addRoles!: HasManyAddAssociationsMixin<Role, string>;
  addRole!: HasManyAddAssociationMixin<Role, string>;
  removeRole!: HasManyRemoveAssociationMixin<Role, string>;
  removeRoles!: HasManyRemoveAssociationsMixin<Role, string>;
  hasRole!: HasManyHasAssociationMixin<Role, string>;
  hasRoles!: HasManyHasAssociationsMixin<Role, string>;
  countRoles!: HasManyCountAssociationsMixin;
}

@InputType()
export class EventCompetitionUpdateInput extends PartialType(
  OmitType(EventCompetition, [
    'createdAt',
    'updatedAt',
    'comments',
    'subEventCompetitions',
    'roles',
    'exceptions',
    'infoEvents',
  ] as const),
  InputType,
) {
  @Field(() => [AvailabilityExceptionInputType], { nullable: true })
  exceptions?: AvailabilityException[];

  @Field(() => [InfoEventInputType], { nullable: true })
  infoEvents?: InfoEvent[];
}

@InputType()
export class EventCompetitionNewInput extends PartialType(
  OmitType(EventCompetitionUpdateInput, ['id'] as const),
  InputType,
) {}

export interface EventException {
  start?: Date;
  end?: Date;
  courts?: number;
}

export interface InfoEvent {
  start?: Date;
  end?: Date;
  name?: string;
}
