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
import { LevelType, UsedRankingTiming } from '@badman/utils';
import { Comment } from './../../comment.model';
import { SubEventCompetition } from './sub-event-competition.model';
import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { Role } from '../../security';

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
  @Column(DataType.UUIDV4)
  id: string;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Unique('EventCompetitions_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  name: string;

  @Unique('EventCompetitions_unique_constraint')
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  season: number;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  lastSync: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  openDate?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  closeDate?: Date;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  comments: Comment[];

  @Field(() => [Role], { nullable: true })
  @HasMany(() => Role, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition',
    },
  })
  roles?: Role[];

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
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode: string;

  @Default(false)
  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  started: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  slug: string;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
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

  @Field(() => Boolean)
  @Column(DataType.BOOLEAN)
  official: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  state: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  country: string;

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
  addSubEventCompetitiont!: HasManyAddAssociationMixin<
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
    'roles'
  ] as const),
  InputType
) {}

@InputType()
export class EventCompetitionNewInput extends PartialType(
  OmitType(EventCompetitionUpdateInput, ['id'] as const),
  InputType
) {}
