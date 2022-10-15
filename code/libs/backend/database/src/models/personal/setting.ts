import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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
import { NotificationType } from '../../enums';
import { Player } from '../player.model';

@Table({
  timestamps: true,
  schema: 'personal',
})
@ObjectType({ description: 'The settings' })
export class Setting extends Model {
  constructor(values?: Partial<Setting>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @ForeignKey(() => Player)
  @Field({ nullable: true })
  @Column
  playerId: string;

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  pushSubscription: PushSubscription;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
  })
  encounterNotEnteredNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
  })
  encounterNotAcceptedNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
  })
  encounterChangeNewNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
  })
  encounterChangeConformationNotification: NotificationType;

  @Field(() => Int)
  @Column({
    type: DataType.INTEGER,
  })
  encounterChangeFinishedNotification: NotificationType;
}

export interface PushSubscription {
  endpoint: string;
  expirationTime: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

