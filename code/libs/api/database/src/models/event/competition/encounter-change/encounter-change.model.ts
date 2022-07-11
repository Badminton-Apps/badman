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
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Comment, CommentNewInput, CommentUpdateInput } from '../../../comment.model';
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
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  accepted?: boolean;

  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  encounter?: EncounterCompetition;

  @ForeignKey(() => EncounterCompetition)
  @Field({ nullable: true })
  @Column
  encounterId: string;

  @Field(() => [EncounterChangeDate], { nullable: true })
  @HasMany(() => EncounterChangeDate, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE',
  })
  dates: EncounterChangeDate[];

  @Field(() => Comment, { nullable: true })
  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'home_comment',
    },
  })
  homeComment: Comment;

  @Field(() => Comment, { nullable: true })
  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'away_comment',
    },
  })
  awayComment: Comment;

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

  // Has one HomeComment
  getHomeComment!: HasOneGetAssociationMixin<Comment>;
  setHomeComment!: HasOneSetAssociationMixin<Comment, string>;

  // Has one AwayComment
  getAwayComment!: HasOneGetAssociationMixin<Comment>;
  setAwayComment!: HasOneSetAssociationMixin<Comment, string>;
}

@InputType()
export class EncounterChangeUpdateInput extends PartialType(
  OmitType(EncounterChange, [
    'createdAt',
    'updatedAt',
    'dates',
    'homeComment',
    'awayComment',
  ] as const),
  InputType
) {
  @Field()
  home: boolean;

  @Field(() => [EncounterChangeDateUpdateInput], { nullable: true })
  dates: EncounterChangeDate[];

  @Field(() => CommentUpdateInput, { nullable: true })
  comment: Comment;
}

@InputType()
export class EncounterChangeNewInput extends PartialType(
  OmitType(EncounterChangeUpdateInput, ['id', 'dates', 'comment'] as const),
  InputType
) {
  @Field(() => [EncounterChangeDateNewInput], { nullable: true })
  dates: EncounterChangeDate[];

  @Field(() => CommentNewInput, { nullable: true })
  comment: Comment;
}
