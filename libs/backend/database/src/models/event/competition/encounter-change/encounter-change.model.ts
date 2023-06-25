import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
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
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import {
  Comment,
  CommentNewInput,
  CommentUpdateInput,
} from '../../../comment.model';
import { EncounterCompetition } from '../encounter-competition.model';
import {
  EncounterChangeDate,
  EncounterChangeDateNewInput,
  EncounterChangeDateUpdateInput,
} from './encounter-change-date.model';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A EncounterChange' })
export class EncounterChange extends Model {
  constructor(values?: Partial<EncounterChange>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => Boolean, { nullable: true })
  @Column(DataType.BOOLEAN)
  accepted?: boolean;

  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  encounter?: EncounterCompetition;

  @ForeignKey(() => EncounterCompetition)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  encounterId?: string;

  @Field(() => [EncounterChangeDate], { nullable: true })
  @HasMany(() => EncounterChangeDate, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE',
  })
  dates?: EncounterChangeDate[];

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'home_comment',
    },
  })
  homeComments?: Comment[];

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'away_comment',
    },
  })
  awayComments?: Comment[];

  // Belongs to Encounter
  getEncounter!: BelongsToGetAssociationMixin<EncounterCompetition>;
  setEncounter!: BelongsToSetAssociationMixin<EncounterCompetition, string>;

  // Has many Date
  getDates!: HasManyGetAssociationsMixin<EncounterChangeDate>;
  setDates!: HasManySetAssociationsMixin<EncounterChangeDate, string>;
  addDates!: HasManyAddAssociationsMixin<EncounterChangeDate, string>;
  addDate!: HasManyAddAssociationMixin<EncounterChangeDate, string>;
  removeDate!: HasManyRemoveAssociationMixin<EncounterChangeDate, string>;
  removeDates!: HasManyRemoveAssociationsMixin<EncounterChangeDate, string>;
  hasDate!: HasManyHasAssociationMixin<EncounterChangeDate, string>;
  hasDates!: HasManyHasAssociationsMixin<EncounterChangeDate, string>;
  countDates!: HasManyCountAssociationsMixin;

  // Has many HomeComment
  getHomeComments!: HasManyGetAssociationsMixin<Comment>;
  setHomeComments!: HasManySetAssociationsMixin<Comment, string>;
  addHomeComments!: HasManyAddAssociationsMixin<Comment, string>;
  addHomeComment!: HasManyAddAssociationMixin<Comment, string>;
  removeHomeComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeHomeComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasHomeComment!: HasManyHasAssociationMixin<Comment, string>;
  hasHomeComments!: HasManyHasAssociationsMixin<Comment, string>;
  countHomeComments!: HasManyCountAssociationsMixin;

  // Has many AwayComment
  getAwayComments!: HasManyGetAssociationsMixin<Comment>;
  setAwayComments!: HasManySetAssociationsMixin<Comment, string>;
  addAwayComments!: HasManyAddAssociationsMixin<Comment, string>;
  addAwayComment!: HasManyAddAssociationMixin<Comment, string>;
  removeAwayComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeAwayComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasAwayComment!: HasManyHasAssociationMixin<Comment, string>;
  hasAwayComments!: HasManyHasAssociationsMixin<Comment, string>;
  countAwayComments!: HasManyCountAssociationsMixin;
}

@InputType()
export class EncounterChangeUpdateInput extends PartialType(
  OmitType(EncounterChange, [
    'createdAt',
    'updatedAt',
    'dates',
    'homeComments',
    'awayComments',
  ] as const),
  InputType
) {
  @Field(() => Boolean)
  home?: boolean;

  @Field(() => [EncounterChangeDateUpdateInput], { nullable: true })
  dates?: EncounterChangeDate[];

  @Field(() => CommentUpdateInput, { nullable: true })
  comment?: Comment;
}

@InputType()
export class EncounterChangeNewInput extends PartialType(
  OmitType(EncounterChangeUpdateInput, ['id', 'dates', 'comment'] as const),
  InputType
) {
  @Field(() => [EncounterChangeDateNewInput], { nullable: true })
  dates?: EncounterChangeDate[];

  @Field(() => CommentNewInput, { nullable: true })
  comment?: Comment;
}
