import { Field, ID, InputType, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
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
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { EncounterCompetition, EventCompetition, EventTournament } from '../event';
import { Player } from '../player.model';
import { Club } from '../club.model';
import { Relation } from '../../wrapper';

@Table({
  timestamps: true,
  schema: 'personal',
})
@ObjectType({ description: 'The settings' })
export class Notification extends Model {
  constructor(values?: Partial<Notification>, options?: BuildOptions) {
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

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'sendToId')
  sendTo?: Relation<Player>;

  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  sendToId?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  type?: string;

  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  linkId?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  linkType?: string;

  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  encounter?: Relation<EncounterCompetition>;

  @Field(() => EventCompetition, { nullable: true })
  @BelongsTo(() => EventCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  competition?: Relation<EventCompetition>;

  @Field(() => EventTournament, { nullable: true })
  @BelongsTo(() => EventTournament, {
    foreignKey: 'linkId',
    constraints: false,
  })
  tournament?: Relation<EventTournament>;

  @Field(() => Club, { nullable: true })
  @BelongsTo(() => Club, {
    foreignKey: 'linkId',
    constraints: false,
  })
  club?: Relation<Club>;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  read?: boolean;

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta?: string;

  // Belongs to Encounter
  getEncounter!: BelongsToGetAssociationMixin<EncounterCompetition>;
  setEncounter!: BelongsToSetAssociationMixin<EncounterCompetition, string>;

  // Belongs to EventCompetition
  getCompetition!: BelongsToGetAssociationMixin<EventCompetition>;
  setCompetition!: BelongsToSetAssociationMixin<EventCompetition, string>;

  // Belongs to EventTournament
  getTournament!: BelongsToGetAssociationMixin<EventTournament>;
  setTournament!: BelongsToSetAssociationMixin<EventTournament, string>;

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;
}

@InputType()
export class NotificationUpdateInput extends PartialType(
  OmitType(Notification, [
    'createdAt',
    'updatedAt',
    'encounter',
    'competition',
    'tournament',
    'club',
    'sendTo',
  ] as const),
  InputType,
) {}

// @InputType()
// export class NotificationNewInput extends PartialType(
//   OmitType(NotificationUpdateInput, ['id'] as const),
//   InputType
// ) {}
