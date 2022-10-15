import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
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
import { EncounterCompetition } from '../event';
import { Player } from '../player.model';

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
  @Column
  id: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'sendToId')
  sendTo: Player;

  @Field({ nullable: true })
  @Column
  sendToId: string;

  @Field({ nullable: true })
  @Column
  type: string;

  @Field({ nullable: true })
  @Column
  title: string;

  @Field({ nullable: true })
  @Column
  message: string;

  @Field({ nullable: true })
  @Column
  linkId: string;

  @Field({ nullable: true })
  @Column
  linkType: string;


  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  encounter: EncounterCompetition;

  @Field({ nullable: true })
  @Column
  read: boolean;

  @Field({ nullable: true })
  @Column({
    type: DataType.JSON,
  })
  meta: string;
}

