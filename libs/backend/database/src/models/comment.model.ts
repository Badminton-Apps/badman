import { Player } from './player.model';
import { EventCompetition } from './event/competition/event-competition.model';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from 'sequelize-typescript';
import { EncounterChange } from './event';
import { Club } from './club.model';
import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { Relation } from '../wrapper';

@Table({
  timestamps: true,
} as TableOptions)
@ObjectType({ description: 'A Comment' })
export class Comment extends Model {
  constructor(values?: Partial<Comment>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => Date, {nullable: true })
  updatedAt?: Date;

  @Field(() => Date, {nullable: true })
  createdAt?: Date;


  @Field(() => String, {nullable: true })
  @Column(DataType.TEXT)
  message?: string;

  @BelongsTo(() => Player, 'playerId')
  player?: Relation<Player>;

  @ForeignKey(() => Player)
  @Index
  @Field(() => ID, {nullable: true })
  @Column(DataType.UUIDV4)
  playerId?: string;

  @BelongsTo(() => Club, 'clubId')
  club?: Relation<Club>;

  @ForeignKey(() => Club)
  @Index
  @Field(() => ID, {nullable: true })
  @Column(DataType.UUIDV4)
  clubId?: string;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  competition?: Relation<EventCompetition>;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'linkId',
    constraints: false,
  })
  encounter?: Relation<EncounterChange>;

  @Index('comment_index')
  @Field(() => ID, {nullable: true })
  @Column(DataType.UUIDV4)
  linkId?: string;

  @Index('comment_index')
  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  linkType?: string;


  // Belongs to Competition
  getCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;
}

@InputType()
export class CommentUpdateInput extends PartialType(
  OmitType(Comment, [
    'createdAt',
    'updatedAt',
    'club',
    'competition',
    'encounter',
  ] as const),
  InputType
) {}

@InputType()
export class CommentNewInput extends PartialType(
  OmitType(CommentUpdateInput, ['id'] as const),
  InputType
) {}
