import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { NotificationType } from '@badman/utils';
import { PushSubscription, PushSubscriptionType } from '../../types';
import { Player } from '../player.model';
import { AvaliableLanguages } from '@badman/utils';

@Table({
  timestamps: true,
  schema: 'personal',
})
@ObjectType({ description: 'The settings' })
export class Setting extends Model {
  constructor(values?: Partial<Setting>, options?: BuildOptions) {
    super(values, options);

    this.pushSubscriptions = values?.pushSubscriptions ?? [];
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id: string;

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.STRING,
  })
  language: AvaliableLanguages;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  playerId: string;

  @Field(() => PushSubscriptionType, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  pushSubscriptions: PushSubscription[];

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  encounterNotEnteredNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  encounterNotAcceptedNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  encounterChangeNewNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  encounterChangeConformationNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  encounterChangeFinishedNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  syncSuccessNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.NONE,
  })
  syncFailedNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
    defaultValue: NotificationType.EMAIL,
  })
  clubEnrollmentNotification: NotificationType;
}

@InputType()
export class SettingUpdateInput extends PartialType(
  OmitType(Setting, ['player', 'pushSubscriptions'] as const),
  InputType
) {}

@InputType()
export class SettingNewInput extends PartialType(
  OmitType(SettingUpdateInput, ['id'] as const),
  InputType
) {}
