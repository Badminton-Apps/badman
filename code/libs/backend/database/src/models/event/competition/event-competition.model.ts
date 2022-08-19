import { Slugify } from '../../../types';
import {
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
import { LevelType, UsedRankingTiming } from '../../../enums';
import { Comment } from './../../comment.model';
import { SubEventCompetition } from './sub-event-competition.model';
import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A EventCompetition' })
export class EventCompetition extends Model {
  constructor(values?: Partial<EventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;

  @Unique('EventCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  name: string;

  @Unique('EventCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  startYear: number;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  comments: Comment[];

  @Field(() => [SubEventCompetition], { nullable: true })
  @HasMany(() => SubEventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  subEventCompetitions: SubEventCompetition[];

  @Field(() => String, { nullable: true })
  @Unique('EventCompetitions_unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAL'))
  type: LevelType;

  @Unique('EventCompetitions_unique_constraint')
  @Field({ nullable: true })
  @Column
  visualCode: string;

  @Default(false)
  @Field({ nullable: true })
  @Column
  allowEnlisting: boolean;

  @Default(false)
  @Field({ nullable: true })
  @Column
  started: boolean;

  @Field({ nullable: true })
  @Column
  slug: string;

  @Field({ nullable: true })
  @Column
  usedRankingAmount: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('months', 'weeks', 'days'))
  usedRankingUnit: 'months' | 'weeks' | 'days';

  get usedRanking(): UsedRankingTiming {
    return {
      amount: this.usedRankingAmount,
      unit: this.usedRankingUnit,
    };
  }

  regenerateSlug!: Slugify<EventCompetition>;

  // Has many SubEvent
  getSubEventCompetitions!: HasManyGetAssociationsMixin<SubEventCompetition>;
  setSubEventCompetitions!: HasManySetAssociationsMixin<
    SubEventCompetition,
    string
  >;
  addSubEventCompetitions!: HasManyAddAssociationsMixin<
    SubEventCompetition,
    string
  >;
  addSubEvenCompetitiont!: HasManyAddAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEventCompetition!: HasManyRemoveAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEventCompetitions!: HasManyRemoveAssociationsMixin<
    SubEventCompetition,
    string
  >;
  hasSubEventCompetition!: HasManyHasAssociationMixin<
    SubEventCompetition,
    string
  >;
  hasSubEventCompetitions!: HasManyHasAssociationsMixin<
    SubEventCompetition,
    string
  >;
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
}

@InputType()
export class EventCompetitionUpdateInput extends PartialType(
  OmitType(EventCompetition, [
    'createdAt',
    'updatedAt',
    'comments',
    'subEventCompetitions',
  ] as const),
  InputType
) {}

@InputType()
export class EventCompetitionNewInput extends PartialType(
  OmitType(EventCompetitionUpdateInput, ['id'] as const),
  InputType
) {}
