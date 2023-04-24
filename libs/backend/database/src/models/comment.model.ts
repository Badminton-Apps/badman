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
  @Column
  id: string;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;


  @Field({ nullable: true })
  @Column(DataType.TEXT)
  message: string;

  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Index
  @Field({ nullable: true })
  @Column
  playerId: string;

  @BelongsTo(() => Club, 'clubId')
  club: Club;

  @ForeignKey(() => Club)
  @Index
  @Field({ nullable: true })
  @Column
  clubId: string;

  @BelongsTo(() => EventCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  competition: EventCompetition;

  @BelongsTo(() => EncounterChange, {
    foreignKey: 'linkId',
    constraints: false,
  })
  encounter: EncounterChange;

  @Index('comment_index')
  @Field({ nullable: true })
  @Column
  linkId: string;

  @Index('comment_index')
  @Field({ nullable: true })
  @Column
  linkType: string;


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
